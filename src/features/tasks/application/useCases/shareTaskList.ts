import { withAssignee, withoutAssignee, type Task } from '../../domain/Task';
import type { TaskEvent, UseCaseResult } from '../../domain/TaskEvent';
import {
  INBOX_LIST_ID,
  withMember,
  withoutMember,
  type ListMember,
  type ListShare,
  type TaskList,
} from '../../domain/TaskList';
import type { Workspace } from '../../domain/Workspace';

function committed(
  workspace: Workspace,
  at: number,
  events: TaskEvent[],
): UseCaseResult {
  return {
    workspace,
    events: [...events, { type: 'workspace.committed', at, workspace }],
  };
}

function replaceList(
  workspace: Workspace,
  listId: string,
  change: (list: TaskList) => TaskList,
): { workspace: Workspace; list: TaskList | null } {
  const current = workspace.lists.find(list => list.id === listId) ?? null;
  if (current == null) return { workspace, list: null };

  const next = change(current);
  return {
    workspace: {
      ...workspace,
      lists: workspace.lists.map(list => (list.id === listId ? next : list)),
    },
    list: next,
  };
}

/** A link now exists for this project, with the caller as its `owner`. */
export function shareTaskList(
  workspace: Workspace,
  listId: string,
  share: ListShare,
  at: number,
): UseCaseResult {
  const { workspace: next, list } = replaceList(workspace, listId, current => ({
    ...current,
    share,
  }));

  if (list == null) return { workspace, events: [] };

  return committed(next, at, [{ type: 'list.shared', at, list }]);
}

/** Removes the link; every task stays exactly where it is. */
export function stopSharing(
  workspace: Workspace,
  listId: string,
  at: number,
): UseCaseResult {
  const current = workspace.lists.find(list => list.id === listId) ?? null;
  if (current == null || current.share == null)
    return { workspace, events: [] };

  const list: TaskList = { ...current, share: undefined };
  const next = {
    ...workspace,
    lists: workspace.lists.map(entry => (entry.id === listId ? list : entry)),
  };

  return committed(next, at, [{ type: 'list.unshared', at, list }]);
}

export function addOrUpdateMember(
  workspace: Workspace,
  listId: string,
  member: ListMember,
  at: number,
): UseCaseResult {
  const { workspace: next, list } = replaceList(workspace, listId, current =>
    withMember(current, member),
  );

  if (list == null || list.share == null) return { workspace, events: [] };

  return committed(next, at, [
    { type: 'list.member.joined', at, list, member },
  ]);
}

export function removeMember(
  workspace: Workspace,
  listId: string,
  personId: string,
  at: number,
): UseCaseResult {
  const { workspace: next, list } = replaceList(workspace, listId, current =>
    withoutMember(current, personId),
  );

  if (list == null) return { workspace, events: [] };

  return committed(next, at, [
    { type: 'list.member.removed', at, list, personId },
  ]);
}

/**
 * Puts one person in or out of one task of a shared project.
 *
 * Assignment is organisation, not score: nothing here touches completion, the
 * day, or points. The permission model is checked by the caller against
 * `canToggleAssignment` and, for real, by the security rule.
 */
export function setTaskAssignment(
  workspace: Workspace,
  taskId: string,
  personId: string,
  assigned: boolean,
  at: number,
): UseCaseResult {
  const current = workspace.tasks.find(task => task.id === taskId) ?? null;
  if (current == null) return { workspace, events: [] };

  const task = assigned
    ? withAssignee(current, personId)
    : withoutAssignee(current, personId);
  if (task === current) return { workspace, events: [] };

  const next: Workspace = {
    ...workspace,
    tasks: workspace.tasks.map(entry => (entry.id === taskId ? task : entry)),
  };

  return committed(next, at, []);
}

/** Applies the remote state of a project this device already belongs to
 * (a pull), without changing which project it is locally. */
export function applyRemoteList(
  workspace: Workspace,
  localListId: string,
  incoming: { list: TaskList; tasks: readonly Task[] },
  at: number,
): UseCaseResult {
  const current = workspace.lists.find(list => list.id === localListId) ?? null;
  if (current == null) return { workspace, events: [] };

  const list: TaskList = { ...incoming.list, id: localListId };
  const tasks = [
    ...workspace.tasks.filter(task => task.listId !== localListId),
    ...incoming.tasks.map(task => ({ ...task, listId: localListId })),
  ];
  const next = {
    ...workspace,
    lists: workspace.lists.map(entry =>
      entry.id === localListId ? list : entry,
    ),
    tasks,
  };

  return committed(next, at, []);
}

/** A member's own device forgets the project; everyone else keeps it. */
export function leaveSharedList(
  workspace: Workspace,
  listId: string,
  personId: string,
  at: number,
): UseCaseResult {
  const list = workspace.lists.find(entry => entry.id === listId) ?? null;
  if (list == null) return { workspace, events: [] };

  const next: Workspace = {
    ...workspace,
    lists: workspace.lists.filter(entry => entry.id !== listId),
    tasks: workspace.tasks.filter(task => task.listId !== listId),
  };

  return committed(next, at, [
    { type: 'list.member.removed', at, list, personId },
  ]);
}

/**
 * Turns a pasted invite into a project on this device.
 *
 * `createList` derives an id from the name, so two "Lançamento" projects
 * collide; the accepted project's id is prefixed by its token instead. The
 * inbox is never a valid target for an incoming project.
 */
export function acceptInvite(
  workspace: Workspace,
  incoming: { list: TaskList; tasks: readonly Task[] },
  joiner: ListMember,
  at: number,
): UseCaseResult {
  if (incoming.list.id === INBOX_LIST_ID || incoming.list.share == null) {
    return { workspace, events: [] };
  }

  const localId = `${incoming.list.id}@${incoming.list.share.token.slice(
    0,
    4,
  )}`;
  if (workspace.lists.some(list => list.id === localId)) {
    return { workspace, events: [] };
  }

  const list: TaskList = { ...incoming.list, id: localId };
  const tasks: Task[] = incoming.tasks.map(task => ({
    ...task,
    id: `${task.id}@${incoming.list.share!.token.slice(0, 4)}`,
    listId: localId,
  }));
  const next: Workspace = {
    ...workspace,
    lists: [...workspace.lists, list],
    tasks: [...workspace.tasks, ...tasks],
  };

  return committed(next, at, [
    { type: 'list.member.joined', at, list, member: joiner },
  ]);
}
