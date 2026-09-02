import { isAddressLikeName, type ListMember, type TaskList } from './TaskList';
import type { Task } from './Task';

/**
 * What happened in a shared project that the other members deserve to hear
 * about: somebody closed a task, or somebody joined.
 *
 * The whole detection is pure — it compares the project that just came off the
 * network with the keys this device has already seen, and says nothing about
 * how the news is delivered. The same function serves the foreground pull and
 * the background sweep.
 */
export interface ActivityActor {
  /** Display name, already free of anything that looks like an address. */
  name: string | null;
  handle: string | null;
}

export type ProjectActivityEvent =
  | {
      kind: 'task-completed';
      token: string;
      projectName: string;
      taskId: string;
      taskTitle: string;
      atMs: number;
      actor: ActivityActor;
    }
  | {
      kind: 'member-joined';
      token: string;
      projectName: string;
      personId: string;
      actor: ActivityActor;
    };

/** The identity of one event, and the only thing the ledger stores. Two pulls
 * of the same remote state produce the same key, which is what keeps a fact
 * from being told twice. */
export function activityEventKey(event: ProjectActivityEvent): string {
  return event.kind === 'task-completed'
    ? `c:${event.token}:${event.taskId}:${event.atMs}`
    : `j:${event.token}:${event.personId}`;
}

/** Name and handle as other people see them. An entry whose name is really an
 * address falls back to the handle: an e-mail never reaches a notification. */
function actorOf(member: ListMember | undefined): ActivityActor {
  if (member == null) return { name: null, handle: null };

  const name = member.name.trim();

  return {
    name: name.length === 0 || isAddressLikeName(name) ? null : name,
    handle: member.handle,
  };
}

function memberOf(
  members: readonly ListMember[],
  personId: string,
): ListMember | undefined {
  return members.find(member => member.personId === personId);
}

/**
 * Everything worth telling about one project, in the order it happened.
 *
 * Anything the signed-in account did itself is never an event, and anything
 * whose key is already in `seenKeys` is dropped: the caller only ever gets
 * facts this device has never announced.
 */
export function detectProjectActivity(
  project: { list: TaskList; tasks: readonly Task[] },
  seenKeys: readonly string[],
  meId: string,
): readonly ProjectActivityEvent[] {
  const share = project.list.share;
  if (share == null) return [];

  const seen = new Set(seenKeys);
  const members = share.members;
  const events: ProjectActivityEvent[] = [];

  for (const task of project.tasks) {
    const by = task.completedBy;
    if (task.completedAtMs == null || by == null || by === meId) continue;

    const event: ProjectActivityEvent = {
      kind: 'task-completed',
      token: share.token,
      projectName: project.list.name,
      taskId: task.id,
      taskTitle: task.title,
      atMs: task.completedAtMs,
      actor: actorOf(memberOf(members, by)),
    };

    if (!seen.has(activityEventKey(event))) events.push(event);
  }

  for (const member of members) {
    if (!member.joined || member.personId === meId) continue;

    const event: ProjectActivityEvent = {
      kind: 'member-joined',
      token: share.token,
      projectName: project.list.name,
      personId: member.personId,
      actor: actorOf(member),
    };

    if (!seen.has(activityEventKey(event))) events.push(event);
  }

  return events;
}
