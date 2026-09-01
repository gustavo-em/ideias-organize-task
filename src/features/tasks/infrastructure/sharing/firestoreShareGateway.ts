import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';

import type { ShareGateway } from '../../application/ports/ShareGateway';
import { sanitizeMemberDays } from '../../domain/SharedMemberDay';
import { sanitizeTasks, type Task } from '../../domain/Task';
import { ShareOperationError } from '../../domain/ShareError';
import {
  isAddressLikeName,
  listColors,
  listRoles,
  projectIcons,
  type ListColor,
  type ListMember,
  type ListRole,
  type ListShare,
  type ProjectIcon,
  type TaskList,
} from '../../domain/TaskList';
import {
  firestoreCommit,
  firestoreDocument,
  type FirestoreValue,
} from './firestoreRest';

const COLLECTION = 'sharedLists';
/** Subcollection holding one document per day of a shared project. */
const DAYS = 'days';

/** Only has to be unguessable enough that nobody stumbles onto a project by
 * accident — the security rule, not the token's length, is what actually
 * keeps a non-member out. */
function createShareToken(): string {
  return Array.from({ length: 10 }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join('');
}

function taskToRecord(task: Task): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    dueAtMs: task.dueAtMs,
    estimatedMinutes: task.estimatedMinutes,
    createdAtMs: task.createdAtMs,
    completedAtMs: task.completedAtMs,
    completedBy: task.completedBy ?? null,
  };
}

function memberFromRecord(value: unknown): ListMember | null {
  if (typeof value !== 'object' || value === null) return null;

  const candidate = value as Partial<Record<keyof ListMember, unknown>>;
  const personId =
    typeof candidate.personId === 'string' ? candidate.personId : null;
  const name = typeof candidate.name === 'string' ? candidate.name : null;
  const handle =
    typeof candidate.handle === 'string' && candidate.handle.length > 0
      ? candidate.handle.toLowerCase()
      : null;

  if (personId == null || name == null) return null;

  return {
    personId,
    name,
    handle,
    role: listRoles.includes(candidate.role as ListRole)
      ? (candidate.role as ListRole)
      : 'viewer',
    joined: candidate.joined === true,
  };
}

/** uids the security rule lets write `tasks`/`name`/`color`/`icon` — owner
 * and editor, never `viewer`. Kept as its own array field because the rule
 * cannot search `members` (an array of maps) to answer "is this uid an
 * editor" on every write. */
function editorIdsOf(members: readonly ListMember[]): string[] {
  return members
    .filter(member => member.role === 'owner' || member.role === 'editor')
    .map(member => member.personId);
}

function asListColor(value: unknown): ListColor {
  return listColors.includes(value as ListColor) ? (value as ListColor) : 'sun';
}

function asProjectIcon(value: unknown): ProjectIcon {
  return projectIcons.includes(value as ProjectIcon)
    ? (value as ProjectIcon)
    : 'layers';
}

function documentToProject(
  token: string,
  fields: Record<string, unknown>,
): { list: TaskList; tasks: readonly Task[] } | null {
  const originId = typeof fields.originId === 'string' ? fields.originId : null;
  const name = typeof fields.name === 'string' ? fields.name : null;
  const invitedAs = fields.invitedAs === 'viewer' ? 'viewer' : 'editor';

  if (originId == null || name == null) return null;

  const members = Array.isArray(fields.members)
    ? (fields.members as unknown[])
        .map(memberFromRecord)
        .filter((m): m is ListMember => m != null)
    : [];

  const share: ListShare = { token, invitedAs, members };
  const list: TaskList = {
    id: originId,
    name,
    color: asListColor(fields.color),
    icon: asProjectIcon(fields.icon),
    share,
  };

  return { list, tasks: sanitizeTasks(fields.tasks) };
}

/** One document per account, holding the name and handle that person chose.
 * Read here so a project stops showing whatever it recorded before profiles
 * existed — a name derived from an address, and no handle at all. */
const USERS = 'users';

async function hydrateMembers(
  members: readonly ListMember[],
): Promise<ListMember[]> {
  const stale = members.filter(
    member => member.handle == null || isAddressLikeName(member.name),
  );
  // Bounded by the size of the project's member list, and only for entries
  // that have something to gain; a project whose members are all named costs
  // no extra read at all.
  if (stale.length === 0) return [...members];

  const found = new Map<string, { name: string; handle: string | null }>();
  await Promise.all(
    stale.map(async member => {
      try {
        const { status, fields } = await firestoreDocument(
          `${USERS}/${member.personId}`,
        );
        if (status === 404 || fields == null) return;

        const name =
          typeof fields.displayName === 'string'
            ? fields.displayName.trim()
            : '';
        const handle =
          typeof fields.handle === 'string' && fields.handle.length > 0
            ? fields.handle.toLowerCase()
            : null;

        if (name.length > 0 || handle != null) {
          found.set(member.personId, {
            name: name.length > 0 ? name : member.name,
            handle,
          });
        }
      } catch {
        // A project that cannot be read in full still opens: the entry keeps
        // whatever it already had.
      }
    }),
  );

  return members.map(member => {
    const profile = found.get(member.personId);

    return profile == null
      ? member
      : { ...member, name: profile.name, handle: profile.handle };
  });
}

export const firestoreShareGateway: ShareGateway = {
  async createLink(list, tasks, invitedAs, owner) {
    const token = createShareToken();
    const auth = getAuth(getApp());

    await firestoreDocument(`${COLLECTION}/${token}`, {
      method: 'PATCH',
      fields: {
        ownerId: auth.currentUser?.uid ?? owner.personId,
        originId: list.id,
        name: list.name,
        color: list.color,
        icon: list.icon,
        invitedAs,
        members: [owner],
        memberIds: [owner.personId],
        editorIds: editorIdsOf([owner]),
        tasks: tasks.map(taskToRecord),
        updatedAtMs: Date.now(),
      },
    });

    return { token, invitedAs, members: [owner] };
  },

  async revokeLink(share) {
    await firestoreDocument(`${COLLECTION}/${share.token}`, {
      method: 'DELETE',
    });
  },

  async removeMember(share, personId) {
    const members = share.members.filter(
      member => member.personId !== personId,
    );

    await firestoreDocument(`${COLLECTION}/${share.token}`, {
      method: 'PATCH',
      updateMask: ['members', 'memberIds', 'editorIds'],
      fields: {
        members,
        memberIds: members.map(member => member.personId),
        editorIds: editorIdsOf(members),
      },
    });
  },

  async updateMemberIdentity(share, member) {
    const { status, updateTime, rawFields } = await firestoreDocument(
      `${COLLECTION}/${share.token}`,
    );
    if (status === 404 || rawFields == null || updateTime == null) return;

    const raw = rawFields.members;
    const entries =
      raw != null && 'arrayValue' in raw ? raw.arrayValue.values ?? [] : [];

    // The stored entries are rewritten as they are, field by field: an entry
    // this version does not understand stays exactly as whoever wrote it left
    // it, and only the two display fields of this person change.
    let changed = false;
    const members = entries.map(entry => {
      if (!('mapValue' in entry)) return entry;

      const fields = entry.mapValue.fields ?? {};
      const personId = fields.personId;
      if (
        personId == null ||
        !('stringValue' in personId) ||
        personId.stringValue !== member.personId
      ) {
        return entry;
      }

      const storedName = fields.name;
      const storedHandle = fields.handle;
      const sameName =
        storedName != null &&
        'stringValue' in storedName &&
        storedName.stringValue === member.name;
      const sameHandle =
        member.handle == null
          ? storedHandle == null || 'nullValue' in storedHandle
          : storedHandle != null &&
            'stringValue' in storedHandle &&
            storedHandle.stringValue === member.handle;

      if (sameName && sameHandle) return entry;

      changed = true;
      return {
        mapValue: {
          fields: {
            ...fields,
            name: { stringValue: member.name },
            handle:
              member.handle == null
                ? { nullValue: null }
                : { stringValue: member.handle },
          },
        },
      } as FirestoreValue;
    });

    // Nothing to say: the project already calls this person what they call
    // themselves, or they are not in it.
    if (!changed) return;

    // `updateTime` as a precondition: somebody joining or being removed
    // between the read and this write wins, and this rename is simply tried
    // again the next time the identity differs.
    await firestoreCommit([
      {
        kind: 'update',
        path: `${COLLECTION}/${share.token}`,
        fields: {},
        rawFields: { members: { arrayValue: { values: members } } },
        updateMask: ['members'],
        requireUpdateTime: updateTime,
      },
    ]);
  },

  async pull(share) {
    const { status, fields } = await firestoreDocument(
      `${COLLECTION}/${share.token}`,
    );
    if (status === 404 || fields == null) return null;

    const project = documentToProject(share.token, fields);
    if (project?.list.share == null) return project;

    const members = await hydrateMembers(project.list.share.members);

    return {
      ...project,
      list: {
        ...project.list,
        share: { ...project.list.share, members },
      },
    };
  },

  async push(share, list, tasks) {
    await firestoreDocument(`${COLLECTION}/${share.token}`, {
      method: 'PATCH',
      updateMask: ['name', 'color', 'icon', 'tasks', 'updatedAtMs'],
      fields: {
        name: list.name,
        color: list.color,
        icon: list.icon,
        tasks: tasks.map(taskToRecord),
        updatedAtMs: Date.now(),
      },
    });
  },

  async publishDay(share, day) {
    // One document per day, with a map keyed by member: publishing a day is
    // a single write on one field path, and reading the whole day is a single
    // document read — no collection query, so nothing here is unbounded.
    await firestoreDocument(
      `${COLLECTION}/${share.token}/${DAYS}/${day.dayKey}`,
      {
        method: 'PATCH',
        updateMask: [`members.${day.personId}`],
        fields: {
          members: {
            [day.personId]: {
              taskIds: [...day.taskIds],
              focusTaskId: day.focusTaskId,
              updatedAtMs: day.updatedAtMs,
            },
          },
        },
      },
    );
  },

  async pullDays(share, dayKey) {
    const { status, fields } = await firestoreDocument(
      `${COLLECTION}/${share.token}/${DAYS}/${dayKey}`,
    );
    if (status === 404 || fields == null) return [];

    const members = fields.members;
    if (typeof members !== 'object' || members === null) return [];

    return sanitizeMemberDays(
      Object.entries(members as Record<string, unknown>).map(
        ([personId, value]) => ({
          ...(typeof value === 'object' && value !== null ? value : {}),
          personId,
          dayKey,
        }),
      ),
    );
  },

  async joinByToken(token, member) {
    const { status, fields } = await firestoreDocument(
      `${COLLECTION}/${token}`,
    );
    if (status === 404 || fields == null) {
      throw new ShareOperationError('invalid-invite');
    }

    // The role granted is whatever the link was created as — never what the
    // joining client claims. A `viewer` link stays `viewer` even if the
    // caller sent something else.
    const grantedRole: Exclude<ListRole, 'owner'> =
      fields.invitedAs === 'viewer' ? 'viewer' : 'editor';

    const existingMembers = Array.isArray(fields.members)
      ? (fields.members as unknown[])
          .map(memberFromRecord)
          .filter((m): m is ListMember => m != null)
      : [];
    const alreadyIn = existingMembers.some(
      candidate => candidate.personId === member.personId,
    );
    const members = alreadyIn
      ? existingMembers
      : [...existingMembers, { ...member, role: grantedRole, joined: true }];

    if (!alreadyIn) {
      await firestoreDocument(`${COLLECTION}/${token}`, {
        method: 'PATCH',
        updateMask: ['members', 'memberIds', 'editorIds'],
        fields: {
          members,
          memberIds: members.map(m => m.personId),
          editorIds: editorIdsOf(members),
        },
      });
    }

    const project = documentToProject(token, { ...fields, members });
    if (project == null) throw new ShareOperationError('invalid-invite');
    if (project.list.share == null) return project;

    return {
      ...project,
      list: {
        ...project.list,
        share: {
          ...project.list.share,
          members: await hydrateMembers(project.list.share.members),
        },
      },
    };
  },
};
