import { clampRemindDays } from '../../domain/DeadlineReminder';
import {
  findTask,
  replaceTask,
  type ReminderRecurrence,
  type Task,
  type TaskKind,
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
  /** Which group inside the space it belongs to, or null to take it out of
   * the one it is in. */
  groupId?: string | null;
  /** Task or reminder. Changing it keeps the title, the date and the space,
   * and drops what the other kind has no room for. */
  kind?: TaskKind;
  /** How often a reminder comes back. Ignored on a task. */
  recurrence?: ReminderRecurrence;
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

  // A reminder is a date that comes back: asked for without one, the item
  // stays the task it already was.
  const kind: TaskKind =
    (edit.kind ?? task.kind ?? 'task') === 'reminder' && dueAtMs != null
      ? 'reminder'
      : 'task';
  const isReminderItem = kind === 'reminder';
  const recurrence: ReminderRecurrence =
    edit.recurrence ?? task.recurrence ?? 'once';
  const movedSpace =
    edit.listId !== undefined && (edit.listId ?? INBOX_LIST_ID) !== task.listId;

  // A title erased to nothing is a slip, not an instruction: the old one stays.
  const next: Task = {
    ...task,
    title: title.length === 0 ? task.title : title,
    priority: edit.priority ?? task.priority,
    dueAtMs,
    // A deadline moved closer takes the reminder with it: what no longer fits
    // becomes the earliest day that does, and a deadline removed removes it.
    remindDaysBefore: isReminderItem
      ? null
      : clampRemindDays(dueAtMs, askedDays, nowMs),
    listId:
      edit.listId === undefined ? task.listId : edit.listId ?? INBOX_LIST_ID,
    // A task moved to another space leaves the group it was in behind: the
    // group belongs to the old space, and a block pointing across spaces is a
    // block that cannot be opened.
    groupId:
      movedSpace || isReminderItem
        ? null
        : edit.groupId === undefined
        ? task.groupId ?? null
        : edit.groupId,
    kind,
    // Turning something into a reminder empties what memory has no use for:
    // the steps, who took it, the estimate and any completion it carried.
    ...(isReminderItem
      ? {
          recurrence,
          subtasks: [],
          assignedIds: [],
          estimatedMinutes: null,
          completedAtMs: null,
          completedBy: null,
        }
      : // Back to work: the recurrence goes with the reminder it belonged to,
        // rather than travelling on as a field nothing reads.
        { recurrence: undefined }),
  };

  const unchanged =
    next.title === task.title &&
    next.priority === task.priority &&
    next.dueAtMs === task.dueAtMs &&
    next.kind === (task.kind ?? 'task') &&
    (next.recurrence ?? null) === (task.recurrence ?? null) &&
    // A task written before reminders existed has no field at all, and "no
    // field" and "no reminder" are the same answer: comparing them raw made
    // every old task look edited by the act of opening it.
    (next.remindDaysBefore ?? null) === (task.remindDaysBefore ?? null) &&
    (next.groupId ?? null) === (task.groupId ?? null) &&
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
