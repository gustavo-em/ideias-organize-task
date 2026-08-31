import {
  findTask,
  replaceTask,
  type Task,
  type TaskPriority,
} from '../../domain/Task';
import type { TaskEvent, UseCaseResult } from '../../domain/TaskEvent';
import { INBOX_LIST_ID } from '../../domain/TaskList';
import type { Workspace } from '../../domain/Workspace';

/**
 * What the person changed by hand.
 *
 * Only the fields actually touched are present. The title arrives as plain
 * text and is stored as written: unlike capture, nothing is parsed out of it —
 * somebody renaming a task to "ligar urgente" means those words, and having
 * the app quietly eat one of them and change the priority would be a small
 * betrayal.
 */
export interface TaskEdit {
  title?: string;
  priority?: TaskPriority;
  dueAtMs?: number | null;
  listId?: string | null;
}

/** Longest title kept, matching what capture allows. */
const MAX_TITLE_LENGTH = 140;

export function editTask(
  workspace: Workspace,
  taskId: string,
  edit: TaskEdit,
  nowMs: number,
): UseCaseResult {
  const task = findTask(workspace.tasks, taskId);

  if (task == null) return { workspace, events: [] };

  const title =
    edit.title == null
      ? task.title
      : edit.title.trim().replace(/\s+/g, ' ').slice(0, MAX_TITLE_LENGTH);

  // A title erased to nothing is a slip, not an instruction: the old one stays.
  const next: Task = {
    ...task,
    title: title.length === 0 ? task.title : title,
    priority: edit.priority ?? task.priority,
    dueAtMs: edit.dueAtMs === undefined ? task.dueAtMs : edit.dueAtMs,
    listId:
      edit.listId === undefined ? task.listId : edit.listId ?? INBOX_LIST_ID,
  };

  const unchanged =
    next.title === task.title &&
    next.priority === task.priority &&
    next.dueAtMs === task.dueAtMs &&
    next.listId === task.listId;

  if (unchanged) return { workspace, events: [] };

  const workspaceNext: Workspace = {
    ...workspace,
    tasks: replaceTask(workspace.tasks, next),
  };
  const events: TaskEvent[] = [
    { type: 'task.edited', at: nowMs, task: next, before: task },
    { type: 'workspace.committed', at: nowMs, workspace: workspaceNext },
  ];

  return { workspace: workspaceNext, events };
}
