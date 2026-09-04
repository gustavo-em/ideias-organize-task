import { REMINDER_HOUR } from './DeadlineReminder';
import { isReminder, type ReminderRecurrence, type Task } from './Task';

/**
 * When a reminder comes back, and when the phone should say so.
 *
 * Arithmetic on dates only: no notification library, no storage, no screen.
 * The scheduler turns what this decides into triggers, and a test can read the
 * same answers without a phone.
 */

/** How many future occurrences are held at once. Notifee has no monthly or
 * yearly repeat, and a phone that is never opened would then speak once and go
 * quiet; holding the next few means a yearly birthday survives three years of
 * the app never being launched. Re-stated on every change and every launch. */
export const REMINDER_LOOKAHEAD = 3;

/** The day-of-month asked for, brought inside a month that is shorter: the
 * 31st becomes the 30th, or the 28th of February. Asking for a day the month
 * does not have must not skip the month. */
function atMonthDay(
  year: number,
  month: number,
  day: number,
  fallbackDay: number,
): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const date = new Date(year, month, Math.min(day, lastDay, fallbackDay));

  date.setHours(REMINDER_HOUR, 0, 0, 0);

  return date;
}

/**
 * The first occurrence strictly after `afterMs`, or null when there is none.
 *
 * Always at nine in the morning, local time — the same hour the deadline
 * warning uses, and the first moment a day can still be rearranged around it.
 * "Once" has exactly one occurrence, so once its morning has passed there is
 * nothing left to wait for.
 */
export function nextOccurrenceAtMs(
  baseAtMs: number | null,
  recurrence: ReminderRecurrence,
  afterMs: number,
): number | null {
  if (baseAtMs == null || !Number.isFinite(baseAtMs)) return null;

  const base = new Date(baseAtMs);
  const first = new Date(baseAtMs);
  first.setHours(REMINDER_HOUR, 0, 0, 0);

  if (first.getTime() > afterMs) return first.getTime();
  if (recurrence === 'once') return null;

  if (recurrence === 'weekly') {
    const week = 7 * 24 * 60 * 60 * 1000;
    const elapsed = afterMs - first.getTime();
    const jumps = Math.floor(elapsed / week) + 1;
    const next = new Date(first.getTime());

    // Walked by calendar days rather than by adding milliseconds, so a daylight
    // saving change does not drag the hour along with it.
    next.setDate(next.getDate() + jumps * 7);
    next.setHours(REMINDER_HOUR, 0, 0, 0);

    return next.getTime() > afterMs
      ? next.getTime()
      : new Date(next.setDate(next.getDate() + 7)).getTime();
  }

  const day = base.getDate();
  const after = new Date(afterMs);

  if (recurrence === 'monthly') {
    let year = after.getFullYear();
    let month = after.getMonth();

    for (let step = 0; step < 3; step += 1) {
      const candidate = atMonthDay(year, month, day, day);

      if (candidate.getTime() > afterMs) return candidate.getTime();

      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }

    return null;
  }

  // Yearly. The 29th of February falls back to the 28th in a common year,
  // because a birthday that skips three years out of four is not a reminder.
  const month = base.getMonth();
  let year = after.getFullYear();

  for (let step = 0; step < 3; step += 1) {
    const candidate = atMonthDay(year, month, day, day);

    if (candidate.getTime() > afterMs) return candidate.getTime();

    year += 1;
  }

  return null;
}

/** The next occurrences, in order, at most `count` of them. A one-off has one,
 * and an expired one-off has none. */
export function upcomingOccurrences(
  baseAtMs: number | null,
  recurrence: ReminderRecurrence,
  nowMs: number,
  count: number = REMINDER_LOOKAHEAD,
): readonly number[] {
  const occurrences: number[] = [];
  let cursor = nowMs;

  for (let index = 0; index < count; index += 1) {
    const next = nextOccurrenceAtMs(baseAtMs, recurrence, cursor);

    if (next == null) break;

    occurrences.push(next);
    cursor = next;
  }

  return occurrences;
}

/** The recurrence of a stored item, with the default the type carries. */
export function recurrenceOf(task: Task): ReminderRecurrence {
  return task.recurrence ?? 'once';
}

/** When this reminder next speaks, or null when it never will again. */
export function nextReminderAtMs(task: Task, nowMs: number): number | null {
  return isReminder(task)
    ? nextOccurrenceAtMs(task.dueAtMs, recurrenceOf(task), nowMs)
    : null;
}

/** One notification the phone should be holding for a reminder. */
export interface ReminderAlert {
  taskId: string;
  title: string;
  /** Position in the look-ahead, which is what keeps the trigger ids stable
   * between two syncs that see the same future. */
  index: number;
  triggerAtMs: number;
}

/**
 * Every alert that should exist right now, computed from the items alone.
 *
 * The scheduler compares this with what the system holds and cancels the rest,
 * so a changed date, a changed recurrence, a deleted reminder and an item
 * turned back into a task all need no special case anywhere.
 */
export function desiredReminderAlerts(
  tasks: readonly Task[],
  nowMs: number,
): readonly ReminderAlert[] {
  const alerts: ReminderAlert[] = [];

  for (const task of tasks) {
    if (!isReminder(task)) continue;

    const occurrences = upcomingOccurrences(
      task.dueAtMs,
      recurrenceOf(task),
      nowMs,
    );

    occurrences.forEach((triggerAtMs, index) => {
      alerts.push({ taskId: task.id, title: task.title, index, triggerAtMs });
    });
  }

  return alerts;
}

/** The reminders of a workspace, soonest first. Anything with no occurrence
 * left goes last, keeping a stable order rather than disappearing. */
export function sortedReminders(
  tasks: readonly Task[],
  nowMs: number,
): readonly Task[] {
  return tasks
    .filter(isReminder)
    .slice()
    .sort((first, second) => {
      const firstAt = nextReminderAtMs(first, nowMs) ?? Number.MAX_SAFE_INTEGER;
      const secondAt =
        nextReminderAtMs(second, nowMs) ?? Number.MAX_SAFE_INTEGER;

      return firstAt !== secondAt
        ? firstAt - secondAt
        : first.createdAtMs - second.createdAtMs;
    });
}
