import { clampRemindDays } from '../../domain/DeadlineReminder';
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
  /** How many days before the deadline to say something, or null for no
   * reminder. Kept inside what the deadline allows, so pulling a date closer
   * cannot leave a reminder pointing at the past. */
  remindDaysBefore?: number | null;
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

  const dueAtMs = edit.dueAtMs === undefined ? task.dueAtMs : edit.dueAtMs;
  const askedDays =
    edit.remindDaysBefore === undefined
      ? task.remindDaysBefore ?? null
      : edit.remindDaysBefore;

  // A title erased to nothing is a slip, not an instruction: the old one stays.
  const next: Task = {
    ...task,
    title: title.length === 0 ? task.title : title,
    priority: edit.priority ?? task.priority,
    dueAtMs,
    // A deadline moved closer takes the reminder with it: what no longer fits
    // becomes the earliest day that does, and a deadline removed removes it.
    remindDaysBefore: clampRemindDays(dueAtMs, askedDays, nowMs),
    listId:
      edit.listId === undefined ? task.listId : edit.listId ?? INBOX_LIST_ID,
  };

  const unchanged =
    next.title === task.title &&
    next.priority === task.priority &&
    next.dueAtMs === task.dueAtMs &&
    // A task written before reminders existed has no field at all, and "no
    // field" and "no reminder" are the same answer: comparing them raw made
    // every old task look edited by the act of opening it.
    (next.remindDaysBefore ?? null) === (task.remindDaysBefore ?? null) &&
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
