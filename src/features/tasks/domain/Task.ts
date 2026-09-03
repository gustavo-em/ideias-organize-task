import { endOfDay, startOfDay } from './Day';
import {
  closeOpenSubtasks,
  countDoneSubtasks,
  reopenSubtasksClosedWithParent,
  sanitizeSubtasks,
  type Subtask,
} from './Subtask';

export const taskPriorities = ['low', 'medium', 'high'] as const;

export type TaskPriority = (typeof taskPriorities)[number];

/** What an item *is*. A task is work, and closing it is the point; a reminder
 * is memory, and there is nothing to close. Absent on everything written
 * before reminders existed, which reads as a task. */
export const taskKinds = ['task', 'reminder'] as const;

export type TaskKind = (typeof taskKinds)[number];

/** How often a reminder comes back. Only meaningful on a reminder, and then
 * always alongside `dueAtMs`, which is the date it counts from. */
export const reminderRecurrences = [
  'once',
  'weekly',
  'monthly',
  'yearly',
] as const;

export type ReminderRecurrence = (typeof reminderRecurrences)[number];

export interface Task {
  id: string;
  title: string;
  listId: string;
  priority: TaskPriority;
  /** When it is due, or null for something with no date at all. */
  dueAtMs: number | null;
  /** What the person expects it to cost, used by the focus timer. */
  estimatedMinutes: number | null;
  /** How many whole days before the deadline the phone should say something,
   * or null for a task nobody asked to be reminded about. Only meaningful
   * alongside `dueAtMs`. Absent on everything written before reminders
   * existed, which is not a reason to drop the task: it simply warns nobody. */
  remindDaysBefore?: number | null;
  createdAtMs: number;
  completedAtMs: number | null;
  /** uid of whoever closed it, for a shared project's task list. Null for an
   * open task, or for one closed before the project was shared. */
  completedBy?: string | null;
  /** uids of whoever took this task in a shared project. Empty is normal: an
   * open task belongs to nobody until someone says otherwise. Never written
   * inside the project's `tasks` array — it is derived from the document's
   * `assignments` map, which is what the security rule can police. */
  assignedIds?: readonly string[];
  /** The steps inside it, at most one level deep. Empty for a task nobody
   * broke down, and empty for anything written before this existed. */
  subtasks: readonly Subtask[];
  /** Task or reminder. Absent means task: everything written before reminders
   * existed is work, and reading it as anything else would silently take those
   * items out of the count. */
  kind?: TaskKind;
  /** How often a reminder comes back. Ignored on a task. */
  recurrence?: ReminderRecurrence;
}

/**
 * What finishing a task is worth.
 *
 * Points come from weight and never from the count. Karma-style scoring
 * rewards volume, so the cheapest route to a higher score there is slicing
 * work into two-minute items; scoring the weight removes that incentive.
 */
export const TASK_WEIGHT: Record<TaskPriority, number> = {
  low: 5,
  medium: 12,
  high: 25,
};

/** Longest title kept, so one pasted paragraph cannot break every list row. */
const MAX_TITLE_LENGTH = 140;

/** A reminder is measured in whole days, never in hours, and never further out
 * than a week: past that it stops being "the deadline is coming" and becomes
 * one more thing in the tray. */
export const MIN_REMIND_DAYS = 1;
export const MAX_REMIND_DAYS = 7;

export function taskWeight(task: Task): number {
  return TASK_WEIGHT[task.priority];
}

export function isCompleted(task: Task): boolean {
  return task.completedAtMs != null;
}

/** Memory rather than work: a birthday, a bill that comes back every month. */
export function isReminder(task: Task): boolean {
  return task.kind === 'reminder';
}

/**
 * Open work: not finished, and a task in the first place.
 *
 * A reminder is never open, and this single answer is what keeps it out of the
 * count of open items, out of the trio, out of the streak and out of the
 * points — none of those places needs to know reminders exist.
 */
export function isOpen(task: Task): boolean {
  return task.completedAtMs == null && !isReminder(task);
}

export function isOverdue(task: Task, nowMs: number): boolean {
  return isOpen(task) && task.dueAtMs != null && task.dueAtMs < nowMs;
}

export function isDueToday(task: Task, nowMs: number): boolean {
  return (
    task.dueAtMs != null &&
    task.dueAtMs >= startOfDay(nowMs) &&
    task.dueAtMs <= endOfDay(nowMs)
  );
}

/**
 * Closing a task closes the steps still open inside it, in the same instant.
 *
 * Leaving them open would mean a finished task reporting "2/5", and asking
 * first would put a dialog in front of the one control the product is about.
 * Each step closed this way is marked, so reopening can undo exactly this.
 */
export function withCompletion(
  task: Task,
  atMs: number,
  completedBy: string | null = null,
): Task {
  return isCompleted(task)
    ? task
    : {
        ...task,
        completedAtMs: atMs,
        completedBy,
        subtasks: closeOpenSubtasks(task.subtasks, atMs),
      };
}

export function withoutCompletion(task: Task): Task {
  return isCompleted(task)
    ? {
        ...task,
        completedAtMs: null,
        completedBy: null,
        subtasks: reopenSubtasksClosedWithParent(task.subtasks),
      }
    : task;
}

/** How many steps are done out of how many there are. `total` of zero means
 * the task was never broken down, and nothing should be shown. */
export function subtaskProgress(task: Task): { done: number; total: number } {
  return {
    done: countDoneSubtasks(task.subtasks),
    total: task.subtasks.length,
  };
}

export function replaceTask(
  tasks: readonly Task[],
  replacement: Task,
): readonly Task[] {
  let changed = false;
  const next = tasks.map(task => {
    if (task.id !== replacement.id) return task;

    changed = true;
    return replacement;
  });

  return changed ? next : tasks;
}

export function findTask(
  tasks: readonly Task[],
  id: string | null,
): Task | null {
  if (id == null) return null;

  return tasks.find(task => task.id === id) ?? null;
}

export function openTasks(tasks: readonly Task[]): readonly Task[] {
  return tasks.filter(isOpen);
}

function sanitizeTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const title = value.trim().replace(/\s+/g, ' ').slice(0, MAX_TITLE_LENGTH);

  return title.length === 0 ? null : title;
}

/** Who a task is assigned to, read as untrusted input: anything that is not a
 * list of ids is simply nobody. */
export function sanitizeAssignedIds(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];

  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.length === 0) continue;
    if (!ids.includes(entry)) ids.push(entry);
  }

  return ids;
}

export function isAssigned(task: Task, personId: string): boolean {
  return (task.assignedIds ?? []).includes(personId);
}

export function withAssignee(task: Task, personId: string): Task {
  return isAssigned(task, personId)
    ? task
    : { ...task, assignedIds: [...(task.assignedIds ?? []), personId] };
}

export function withoutAssignee(task: Task, personId: string): Task {
  return isAssigned(task, personId)
    ? {
        ...task,
        assignedIds: (task.assignedIds ?? []).filter(id => id !== personId),
      }
    : task;
}

/** How far ahead a reminder may be asked for, read as untrusted input:
 * anything that is not a whole number of days inside the allowed range is
 * nobody asking for a reminder at all. */
export function sanitizeRemindDays(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;

  const days = Math.round(value);

  return days >= MIN_REMIND_DAYS && days <= MAX_REMIND_DAYS ? days : null;
}

/** What the stored item is, read as untrusted input. A reminder without a date
 * has nothing to come back on, so it is read as the task it looks like rather
 * than dropped. */
export function sanitizeKind(value: unknown, dueAtMs: number | null): TaskKind {
  return value === 'reminder' && dueAtMs != null ? 'reminder' : 'task';
}

export function sanitizeRecurrence(value: unknown): ReminderRecurrence {
  return reminderRecurrences.includes(value as ReminderRecurrence)
    ? (value as ReminderRecurrence)
    : 'once';
}

function sanitizeTimestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Stored tasks come off the device's disk, so they are read as untrusted
 * input: an entry that cannot be understood is dropped rather than allowed to
 * reach a screen half-formed.
 */
export function sanitizeTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const tasks: Task[] = [];

  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;

    const candidate = entry as Partial<Record<keyof Task, unknown>>;
    const title = sanitizeTitle(candidate.title);
    const id = typeof candidate.id === 'string' ? candidate.id : null;

    if (title == null || id == null || seen.has(id)) continue;

    seen.add(id);
    const dueAtMs = sanitizeTimestamp(candidate.dueAtMs);
    const kind = sanitizeKind(candidate.kind, dueAtMs);

    tasks.push({
      id,
      title,
      listId: typeof candidate.listId === 'string' ? candidate.listId : 'inbox',
      priority: taskPriorities.includes(candidate.priority as TaskPriority)
        ? (candidate.priority as TaskPriority)
        : 'medium',
      dueAtMs,
      estimatedMinutes:
        typeof candidate.estimatedMinutes === 'number' &&
        Number.isFinite(candidate.estimatedMinutes) &&
        candidate.estimatedMinutes > 0
          ? Math.round(candidate.estimatedMinutes)
          : null,
      remindDaysBefore: sanitizeRemindDays(candidate.remindDaysBefore),
      createdAtMs: sanitizeTimestamp(candidate.createdAtMs) ?? 0,
      completedAtMs: sanitizeTimestamp(candidate.completedAtMs),
      completedBy:
        typeof candidate.completedBy === 'string'
          ? candidate.completedBy
          : null,
      assignedIds: sanitizeAssignedIds(candidate.assignedIds),
      // Absent on everything written before subtasks existed, which is not a
      // reason to drop the task: it simply has no steps.
      subtasks: kind === 'reminder' ? [] : sanitizeSubtasks(candidate.subtasks),
      kind,
      ...(kind === 'reminder'
        ? { recurrence: sanitizeRecurrence(candidate.recurrence) }
        : {}),
    });
  }

  return tasks;
}
