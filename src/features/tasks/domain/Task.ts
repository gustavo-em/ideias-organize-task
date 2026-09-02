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

export interface Task {
  id: string;
  title: string;
  listId: string;
  priority: TaskPriority;
  /** When it is due, or null for something with no date at all. */
  dueAtMs: number | null;
  /** What the person expects it to cost, used by the focus timer. */
  estimatedMinutes: number | null;
  createdAtMs: number;
  completedAtMs: number | null;
  /** uid of whoever closed it, for a shared project's task list. Null for an
   * open task, or for one closed before the project was shared. */
  completedBy?: string | null;
  /** The steps inside it, at most one level deep. Empty for a task nobody
   * broke down, and empty for anything written before this existed. */
  subtasks: readonly Subtask[];
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

export function taskWeight(task: Task): number {
  return TASK_WEIGHT[task.priority];
}

export function isCompleted(task: Task): boolean {
  return task.completedAtMs != null;
}

export function isOpen(task: Task): boolean {
  return task.completedAtMs == null;
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
    tasks.push({
      id,
      title,
      listId: typeof candidate.listId === 'string' ? candidate.listId : 'inbox',
      priority: taskPriorities.includes(candidate.priority as TaskPriority)
        ? (candidate.priority as TaskPriority)
        : 'medium',
      dueAtMs: sanitizeTimestamp(candidate.dueAtMs),
      estimatedMinutes:
        typeof candidate.estimatedMinutes === 'number' &&
        Number.isFinite(candidate.estimatedMinutes) &&
        candidate.estimatedMinutes > 0
          ? Math.round(candidate.estimatedMinutes)
          : null,
      createdAtMs: sanitizeTimestamp(candidate.createdAtMs) ?? 0,
      completedAtMs: sanitizeTimestamp(candidate.completedAtMs),
      completedBy:
        typeof candidate.completedBy === 'string'
          ? candidate.completedBy
          : null,
      // Absent on everything written before subtasks existed, which is not a
      // reason to drop the task: it simply has no steps.
      subtasks: sanitizeSubtasks(candidate.subtasks),
    });
  }

  return tasks;
}
