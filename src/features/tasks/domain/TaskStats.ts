import { DAY_MS, startOfDay } from './Day';
import type { TaskList } from './TaskList';
import { isOpen, type Task } from './Task';

/**
 * What the board on the You tab is made of.
 *
 * Everything here is derived from the tasks and the lists that already live on
 * the device: no new stored field, nothing synced, nothing invented. A number
 * on that screen can always be recounted by hand from the task list.
 */

export interface TaskBalance {
  open: number;
  closed: number;
  total: number;
  /** Zero to one. Zero when there is nothing at all, so an empty board draws an
   * empty ring instead of a full one. */
  closedShare: number;
}

export function getTaskBalance(tasks: readonly Task[]): TaskBalance {
  const open = tasks.filter(isOpen).length;
  const total = tasks.length;
  const closed = total - open;

  return {
    open,
    closed,
    total,
    closedShare: total === 0 ? 0 : closed / total,
  };
}

export interface ClosedDay {
  dayMs: number;
  closed: number;
}

/** The last `days` days, oldest first, with empty days kept so the chart never
 * changes shape at the start of a week. */
export function getClosedByDay(
  tasks: readonly Task[],
  nowMs: number,
  days = 7,
): readonly ClosedDay[] {
  const today = startOfDay(nowMs);
  const counts = new Map<number, number>();

  for (const task of tasks) {
    if (task.completedAtMs == null) continue;

    const dayMs = startOfDay(task.completedAtMs);

    if (dayMs > today || dayMs <= today - days * DAY_MS) continue;

    counts.set(dayMs, (counts.get(dayMs) ?? 0) + 1);
  }

  const week: ClosedDay[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const dayMs = today - offset * DAY_MS;

    week.push({ dayMs, closed: counts.get(dayMs) ?? 0 });
  }

  return week;
}

export interface WeekdayPattern {
  /** Seven totals, Sunday first, matching `Date#getDay`. */
  byWeekday: readonly number[];
  /** The weekday with the most closures, or null while the window has not seen
   * enough work to call one: a best day drawn from a single closed task is a
   * lie, and it changes every time anything is ticked. */
  bestWeekday: number | null;
  bestCount: number;
}

/** How much has to have happened before naming a favourite weekday: three
 * closures, spread over at least two different weekdays. */
export const WEEKDAY_PATTERN_MIN_CLOSED = 3;
export const WEEKDAY_PATTERN_MIN_WEEKDAYS = 2;

/** Which weekday the person actually finishes things on, over `windowDays`. A
 * tie keeps the earliest weekday, so the answer never flickers. */
export function getWeekdayPattern(
  tasks: readonly Task[],
  nowMs: number,
  windowDays = 28,
): WeekdayPattern {
  const today = startOfDay(nowMs);
  const oldest = today - (windowDays - 1) * DAY_MS;
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];

  for (const task of tasks) {
    if (task.completedAtMs == null) continue;

    const dayMs = startOfDay(task.completedAtMs);

    if (dayMs < oldest || dayMs > today) continue;

    byWeekday[new Date(dayMs).getDay()] += 1;
  }

  const closed = byWeekday.reduce((sum, count) => sum + count, 0);
  const spread = byWeekday.filter(count => count > 0).length;

  if (
    closed < WEEKDAY_PATTERN_MIN_CLOSED ||
    spread < WEEKDAY_PATTERN_MIN_WEEKDAYS
  ) {
    return { byWeekday, bestWeekday: null, bestCount: 0 };
  }

  let bestWeekday: number | null = null;
  let bestCount = 0;

  byWeekday.forEach((count, weekday) => {
    if (count > bestCount) {
      bestCount = count;
      bestWeekday = weekday;
    }
  });

  return { byWeekday, bestWeekday, bestCount };
}

export interface ActiveProjects {
  active: number;
  total: number;
  /** Zero to one, for the proportion bar. */
  share: number;
}

/** A project counts as active while it still holds something open. */
export function getActiveProjects(
  tasks: readonly Task[],
  lists: readonly TaskList[],
): ActiveProjects {
  const withOpen = new Set(tasks.filter(isOpen).map(task => task.listId));
  const total = lists.length;
  const active = lists.filter(list => withOpen.has(list.id)).length;

  return { active, total, share: total === 0 ? 0 : active / total };
}
