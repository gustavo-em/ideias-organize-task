import { daysBetween, startOfDay } from './Day';
import { isOpen, MAX_REMIND_DAYS, MIN_REMIND_DAYS, type Task } from './Task';

/**
 * When a deadline reminder goes off, and which ones can be asked for.
 *
 * Everything here is arithmetic on timestamps: no notification library, no
 * storage, no screen. The scheduler turns what this decides into triggers, and
 * a test can read the same answers without a phone.
 */

/** The hour the phone speaks, in local time. Midnight would arrive while the
 * person is asleep and be gone by morning; nine o'clock is the first moment
 * the day can still be rearranged around it. */
export const REMINDER_HOUR = 9;

/** How long after "now" a reminder lands when its own morning has already
 * passed. Long enough not to fire while the sheet is still closing. */
export const LATE_REMINDER_DELAY_MS = 60 * 1000;

/**
 * How many days ahead this deadline can be announced.
 *
 * Only what fits between today and the deadline: a task due in two days can be
 * announced one or two days early, never three. A deadline today or already
 * past has no room at all, and offering "1 day before" there would be
 * offering the past.
 */
export function reminderDayOptions(
  dueAtMs: number | null,
  nowMs: number,
): readonly number[] {
  if (dueAtMs == null) return [];

  const span = daysBetween(nowMs, dueAtMs);
  const last = Math.min(span, MAX_REMIND_DAYS);

  if (last < MIN_REMIND_DAYS) return [];

  const options: number[] = [];
  for (let days = MIN_REMIND_DAYS; days <= last; days += 1) options.push(days);

  return options;
}

/**
 * The chosen number of days, brought back inside what the deadline allows.
 *
 * Pulling a deadline closer must not silently drop the reminder the person
 * asked for: it becomes the earliest one that still fits. When nothing fits,
 * there is no reminder to keep.
 */
export function clampRemindDays(
  dueAtMs: number | null,
  days: number | null,
  nowMs: number,
): number | null {
  if (days == null) return null;

  const options = reminderDayOptions(dueAtMs, nowMs);

  if (options.length === 0) return null;

  const largest = options[options.length - 1];

  return Math.min(Math.max(days, MIN_REMIND_DAYS), largest);
}

/**
 * The morning this reminder belongs to: nine o'clock, so many days before the
 * deadline. It can be in the past, and saying so is the point — it is the
 * identity of the reminder, which is how a phone can tell "not spoken yet"
 * from "already said once".
 */
export function reminderMorningAtMs(
  dueAtMs: number | null,
  days: number | null,
  nowMs: number,
): number | null {
  if (dueAtMs == null || days == null) return null;

  const clamped = clampRemindDays(dueAtMs, days, nowMs);
  if (clamped == null) return null;

  const morning = new Date(startOfDay(dueAtMs));
  morning.setDate(morning.getDate() - clamped);
  morning.setHours(REMINDER_HOUR, 0, 0, 0);

  return morning.getTime();
}

/**
 * The exact moment the phone should speak, or null when it no longer can.
 *
 * Nine in the morning of the chosen day. If that morning is already behind us
 * — the reminder was set late in the evening for tomorrow — it goes off in a
 * minute instead, which is still before the deadline and still useful. Once
 * even the deadline has passed, there is nothing left to warn about.
 */
export function reminderTriggerAtMs(
  dueAtMs: number | null,
  days: number | null,
  nowMs: number,
): number | null {
  const atMs = reminderMorningAtMs(dueAtMs, days, nowMs);

  if (atMs == null || dueAtMs == null) return null;
  if (atMs > nowMs) return atMs;

  const soon = nowMs + LATE_REMINDER_DELAY_MS;

  return soon < dueAtMs ? soon : null;
}

/** One reminder the phone should be holding right now. */
export interface DeadlineReminder {
  taskId: string;
  title: string;
  dueAtMs: number;
  /** Days between the reminder and the deadline, after clamping. */
  daysBefore: number;
  triggerAtMs: number;
  /** Which morning this reminder is for, even when that morning has passed.
   * Two syncs on the same day produce the same value, which is what stops a
   * late reminder from being said again every time the app opens. */
  morningAtMs: number;
  /** True when that morning is already behind us, so the trigger is the
   * catch-up one rather than the morning itself. */
  isLate: boolean;
  /** What this reminder *is*, rather than when it next goes off: the deadline
   * and the lead time the person asked for. It only changes when they change
   * one of the two, which is what tells a repeat from a new decision. */
  identity: string;
}

/** The deadline and the lead time asked for, as one comparable value. */
export function reminderIdentity(
  dueAtMs: number,
  askedDaysBefore: number,
): string {
  return `${dueAtMs}:${askedDaysBefore}`;
}

/**
 * Every reminder that should exist for this workspace, as of now.
 *
 * A finished task never warns anybody, and neither does one without a deadline
 * or without a reminder asked for. The scheduler compares this list with what
 * the system is holding, so anything absent here is cancelled by construction.
 */
export function desiredReminders(
  tasks: readonly Task[],
  nowMs: number,
): readonly DeadlineReminder[] {
  const reminders: DeadlineReminder[] = [];

  for (const task of tasks) {
    if (
      !isOpen(task) ||
      task.dueAtMs == null ||
      task.remindDaysBefore == null
    ) {
      continue;
    }

    const daysBefore = clampRemindDays(
      task.dueAtMs,
      task.remindDaysBefore,
      nowMs,
    );
    const morningAtMs = reminderMorningAtMs(
      task.dueAtMs,
      task.remindDaysBefore,
      nowMs,
    );
    const triggerAtMs = reminderTriggerAtMs(
      task.dueAtMs,
      task.remindDaysBefore,
      nowMs,
    );

    if (daysBefore == null || triggerAtMs == null || morningAtMs == null) {
      continue;
    }

    reminders.push({
      taskId: task.id,
      title: task.title,
      dueAtMs: task.dueAtMs,
      daysBefore,
      triggerAtMs,
      morningAtMs,
      isLate: morningAtMs <= nowMs,
      identity: reminderIdentity(task.dueAtMs, task.remindDaysBefore),
    });
  }

  return reminders;
}
