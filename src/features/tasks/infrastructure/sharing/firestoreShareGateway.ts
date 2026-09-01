import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';

import type { ShareGateway } from '../../application/ports/ShareGateway';
import { sanitizeTasks, type Task } from '../../domain/Task';
import { ShareOperationError } from '../../domain/ShareError';
import {
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
import { firestoreDocument } from './firestoreRest';

const COLLECTION = 'sharedLists';

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

  if (personId == null || name == null) return null;

  return {
    personId,
    name,
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

  async pull(share) {
    const { status, fields } = await firestoreDocument(
      `${COLLECTION}/${share.token}`,
    );
    if (status === 404 || fields == null) return null;

    return documentToProject(share.token, fields);
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

    return project;
  },
};
