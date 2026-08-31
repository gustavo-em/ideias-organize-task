import { DAY_MS, daysBetween, startOfDay } from './Day';
import {
  isCompleted,
  isDueToday,
  isOpen,
  isOverdue,
  taskWeight,
  type Task,
} from './Task';

/**
 * How many tasks a day holds by default.
 *
 * The number came from the research: a list that shows forty-seven overdue
 * items is the thing people close and never open again. It is a default rather
 * than a law — the person chooses their own capacity in settings, and
 * `UNLIMITED_DAY` removes the ceiling entirely.
 */
export const DEFAULT_DAY_CAPACITY = 3;

/** A day with no ceiling: everything still open belongs to today. */
export const UNLIMITED_DAY = 0;

function slotsFor(capacity: number, openCount: number): number {
  return capacity === UNLIMITED_DAY ? openCount : capacity;
}

export interface TrioSelection {
  /** Midnight of the day this selection belongs to. A trio does not survive
   * the night: tomorrow gets its own three. */
  dayMs: number;
  taskIds: readonly string[];
}

export const EMPTY_TRIO: TrioSelection = { dayMs: 0, taskIds: [] };

/**
 * How urgent one task looks against the others.
 *
 * Priority comes first and by a wide margin: a task marked high outranks
 * anything below it, whatever their dates say. Inside a priority, the order is
 * still deliberate — something already late outranks what is due today, which
 * outranks what is merely coming — and age is the last word, so a task nobody
 * has touched for a fortnight eventually gets a turn instead of sinking for
 * good.
 */
export function taskUrgency(task: Task, nowMs: number): number {
  if (isCompleted(task)) return 0;

  // Wide enough that no combination of dates can lift a lower priority past a
  // higher one.
  let score = taskWeight(task) * 400;

  if (isOverdue(task, nowMs)) {
    score += 1000;
  } else if (isDueToday(task, nowMs)) {
    score += 600;
  } else if (task.dueAtMs != null) {
    const daysAway = Math.max(0, daysBetween(nowMs, task.dueAtMs));
    score += daysAway <= 3 ? 300 - daysAway * 40 : Math.max(0, 120 - daysAway);
  }

  const ageDays = Math.max(0, daysBetween(task.createdAtMs, nowMs));
  score += Math.min(ageDays, 30) * 2;

  return score;
}

/** The three the app would pick, most urgent first. */
export function proposeTrio(
  tasks: readonly Task[],
  nowMs: number,
  capacity: number = DEFAULT_DAY_CAPACITY,
): readonly Task[] {
  const open = tasks.filter(isOpen);

  return [...open]
    .sort((first, second) => {
      const difference = taskUrgency(second, nowMs) - taskUrgency(first, nowMs);

      // A stable tie-break keeps the proposal from reshuffling between two
      // renders of the same morning.
      return difference !== 0
        ? difference
        : first.createdAtMs - second.createdAtMs;
    })
    .slice(0, slotsFor(capacity, open.length));
}

/** True when the stored selection was made on a different day, which is what
 * asks for a new proposal on opening. */
export function isTrioStale(trio: TrioSelection, nowMs: number): boolean {
  return trio.dayMs !== startOfDay(nowMs);
}

export function assembleTrio(
  tasks: readonly Task[],
  nowMs: number,
  capacity: number = DEFAULT_DAY_CAPACITY,
): TrioSelection {
  return {
    dayMs: startOfDay(nowMs),
    taskIds: proposeTrio(tasks, nowMs, capacity).map(task => task.id),
  };
}

/**
 * Keeps a trio honest across a day of use.
 *
 * A task that was deleted leaves the trio; a task finished this morning stays
 * in it, because removing it would erase the sense of having got somewhere.
 * An empty slot is refilled from what is left.
 */
export function refreshTrio(
  trio: TrioSelection,
  tasks: readonly Task[],
  nowMs: number,
  capacity: number = DEFAULT_DAY_CAPACITY,
): TrioSelection {
  const today = startOfDay(nowMs);
  const byId = new Map(tasks.map(task => [task.id, task]));
  const kept =
    trio.dayMs === today ? trio.taskIds.filter(id => byId.has(id)) : [];
  const openCount = tasks.filter(isOpen).length;
  const missing = slotsFor(capacity, openCount) - kept.length;

  if (missing <= 0) {
    return kept.length === trio.taskIds.length && trio.dayMs === today
      ? trio
      : { dayMs: today, taskIds: kept };
  }

  const chosen = new Set(kept);
  const fill = proposeTrio(
    tasks.filter(task => !chosen.has(task.id)),
    nowMs,
    capacity,
  ).slice(0, missing);

  const taskIds = [...kept, ...fill.map(task => task.id)];
  const unchanged =
    trio.dayMs === today &&
    taskIds.length === trio.taskIds.length &&
    taskIds.every((id, index) => id === trio.taskIds[index]);

  return unchanged ? trio : { dayMs: today, taskIds };
}

export function trioTasks(
  trio: TrioSelection,
  tasks: readonly Task[],
): readonly Task[] {
  const byId = new Map(tasks.map(task => [task.id, task]));

  return trio.taskIds
    .map(id => byId.get(id))
    .filter((task): task is Task => task != null);
}

export function trioDoneCount(
  trio: TrioSelection,
  tasks: readonly Task[],
): number {
  return trioTasks(trio, tasks).filter(isCompleted).length;
}

/**
 * A day is closed when it had something in it and all of it is done.
 *
 * It used to require a full trio, which stopped making sense once the capacity
 * became the person's own choice: with no ceiling there is no "full", and with
 * a ceiling of five a four-task day could never close.
 */
export function isTrioComplete(
  trio: TrioSelection,
  tasks: readonly Task[],
): boolean {
  const chosen = trioTasks(trio, tasks);

  return chosen.length > 0 && chosen.every(isCompleted);
}

/** What is waiting outside today: counted, never listed on the day screen. */
export function backlogCount(
  trio: TrioSelection,
  tasks: readonly Task[],
): number {
  const chosen = new Set(trio.taskIds);

  return tasks.filter(task => isOpen(task) && !chosen.has(task.id)).length;
}

export function sanitizeTrio(value: unknown, nowMs: number): TrioSelection {
  if (typeof value !== 'object' || value === null) return EMPTY_TRIO;

  const candidate = value as Partial<Record<keyof TrioSelection, unknown>>;
  const dayMs =
    typeof candidate.dayMs === 'number' && Number.isFinite(candidate.dayMs)
      ? startOfDay(candidate.dayMs)
      : 0;

  // A selection from the far future is a clock that moved, not a plan.
  if (dayMs > startOfDay(nowMs) + DAY_MS) return EMPTY_TRIO;

  const taskIds = Array.isArray(candidate.taskIds)
    ? candidate.taskIds.filter((id): id is string => typeof id === 'string')
    : [];

  return { dayMs, taskIds };
}
