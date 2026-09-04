import {
  getAnalytics,
  logEvent,
  logScreenView,
  setUserId,
} from '@react-native-firebase/analytics';

import type { UsageReporter } from '../../application/ports/UsageReporter';
import { consoleUsageReporter } from './consoleUsageReporter';

/**
 * Telemetry, sent to Firebase Analytics.
 *
 * Every event here is a question somebody actually asks about the product:
 * whether tasks are written from the day screen or from inside a space, how
 * many people ever open a reminder, whether the walk-through's invite is
 * accepted, whether a focus timer that starts also finishes.
 *
 * What is never sent is what somebody wrote. Titles, list and group names and
 * typed text stay on the device — the parameters below are shapes and counts,
 * which is all a product decision needs. The account identifier is the one
 * Firebase Auth mints, so a person on two phones counts once without anything
 * about them travelling.
 *
 * In development it also goes to the log, because an event that cannot be read
 * until it reaches a dashboard hours later cannot be checked at all.
 */
export const firebaseUsageReporter: UsageReporter = {
  async identify(personId) {
    await consoleUsageReporter.identify(personId);
    await setUserId(analytics(), personId);
  },

  async taskCaptured(input) {
    await consoleUsageReporter.taskCaptured(input);
    await send('task_captured', {
      priority: input.priority,
      kind: input.kind,
      recurrence: input.recurrence,
      origin: input.origin,
      has_due_date: flag(input.hasDueDate),
      has_list: flag(input.hasList),
      has_group: flag(input.hasGroup),
      remind_days_before: input.remindDaysBefore,
      subtask_count: input.subtaskCount,
      took_seconds: input.tookSeconds,
    });
  },

  async taskCompleted(input) {
    await consoleUsageReporter.taskCompleted(input);
    await send('task_completed', {
      weight: input.weight,
      in_trio: flag(input.inTrio),
    });
  },

  async groupCreated(input) {
    await consoleUsageReporter.groupCreated(input);
    await send('group_created', {
      icon: input.icon,
      has_event_date: flag(input.hasEventDate),
    });
  },

  async trioCompleted(input) {
    await consoleUsageReporter.trioCompleted(input);
    await send('trio_completed', { streak_days: input.streakDays });
  },

  async focusStarted(input) {
    await consoleUsageReporter.focusStarted(input);
    await send('focus_started', { planned_minutes: input.plannedMinutes });
  },

  async focusFinished(input) {
    await consoleUsageReporter.focusFinished(input);
    await send('focus_finished', {
      minutes: input.minutes,
      reached_end: flag(input.reachedEnd),
    });
  },

  async screenOpened(screen) {
    await consoleUsageReporter.screenOpened(screen);
    // The reserved screen event rather than one of ours: it is what feeds the
    // engagement reports the console draws by itself.
    await logScreenView(analytics(), {
      screen_name: screen,
      screen_class: screen,
    });
  },

  async listShared() {
    await consoleUsageReporter.listShared();
    await send('list_shared', {});
  },

  async listMemberJoined(input) {
    await consoleUsageReporter.listMemberJoined(input);
    await send('list_member_joined', { member_count: input.memberCount });
  },

  async onboardingFinished(input) {
    await consoleUsageReporter.onboardingFinished(input);
    await send('onboarding_finished', { outcome: input.outcome });
  },
};

/** Resolved on every call rather than held: the default app is configured by
 * the native side at launch, and this module is imported before that. */
function analytics() {
  return getAnalytics();
}

/**
 * Analytics takes strings and numbers, and nothing else.
 *
 * A parameter with nothing to say is dropped rather than sent as an empty
 * string: an absent value and the string "null" read the same in a report, and
 * only one of them is true.
 */
async function send(
  name: string,
  params: Record<string, string | number | null | undefined>,
): Promise<void> {
  const payload: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value != null) payload[key] = value;
  }

  await logEvent(analytics(), name, payload);
}

/** A yes/no as a number, so a report can average it into a share. */
function flag(value: boolean): number {
  return value ? 1 : 0;
}
