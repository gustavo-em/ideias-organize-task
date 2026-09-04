import notifee, {
  AuthorizationStatus,
  TriggerType,
  type TimestampTrigger,
} from '@notifee/react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { desiredReminders } from '../../domain/DeadlineReminder';
import type { Task } from '../../domain/Task';
import { deadlineNotificationLines } from '../../presentation/localization/deadlineNotificationCopy';
import type { AppLanguage } from '../../presentation/localization/taskCopy';
import { ACTIVITY_CHANNEL_ID, ensureChannel } from './notifeeActivityNotifier';

/** Which reminder each task has already been caught up on, kept on disk so a
 * catch-up is said once and not again on every launch. The value is the
 * reminder's identity — deadline and lead time asked for — because the morning
 * it points at moves closer every day while the reminder stays the same one. */
const SPOKEN_KEY = 'ideias.deadlineReminders.v2';

type SpokenMornings = Record<string, string>;

async function loadSpoken(): Promise<SpokenMornings> {
  try {
    const stored = await AsyncStorage.getItem(SPOKEN_KEY);
    if (stored == null) return {};

    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) return {};

    const spoken: SpokenMornings = {};
    for (const [taskId, value] of Object.entries(parsed)) {
      if (typeof value === 'string') spoken[taskId] = value;
    }

    return spoken;
  } catch {
    // A record that cannot be read is one nobody was warned by: at worst a
    // reminder is repeated once, which beats losing every one of them.
    return {};
  }
}

/** Every reminder this app schedules carries this prefix, so the sweep can
 * tell its own pending triggers apart from anything else the phone holds. */
export const DEADLINE_TRIGGER_PREFIX = 'task-due.';

export function deadlineTriggerId(taskId: string): string {
  return `${DEADLINE_TRIGGER_PREFIX}${taskId}`;
}

async function isAllowed(): Promise<boolean> {
  try {
    const settings = await notifee.getNotificationSettings();

    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

/**
 * Makes the phone hold exactly the reminders the tasks ask for.
 *
 * The desired set is computed from the tasks alone, and everything pending
 * outside it is cancelled: changing a date, finishing a task or deleting it
 * needs no special case here, because the task simply stops asking. Nothing in
 * this function throws — a phone that will not schedule is a phone that stays
 * quiet, never one that takes the app down with it.
 */
export async function syncDeadlineReminders(
  tasks: readonly Task[],
  nowMs: number,
  language: AppLanguage,
): Promise<void> {
  try {
    const pending = (await notifee.getTriggerNotificationIds()).filter(id =>
      id.startsWith(DEADLINE_TRIGGER_PREFIX),
    );

    if (!(await isAllowed())) {
      // Permission was refused or taken away: what is still pending is
      // cancelled, so nothing survives the person saying no.
      if (pending.length > 0) await notifee.cancelTriggerNotifications(pending);
      return;
    }

    const spoken = await loadSpoken();
    // A morning already behind us is only worth catching up on once. What is
    // remembered is the reminder itself, not the morning: as the deadline
    // draws nearer the lead time shrinks and the morning moves forward, so a
    // date-by-date comparison would let the same reminder speak again every
    // day until the deadline. Changing the date or the lead time is a new
    // decision, and that one is heard.
    const reminders = desiredReminders(tasks, nowMs).filter(
      reminder =>
        !reminder.isLate || spoken[reminder.taskId] !== reminder.identity,
    );
    const wanted = new Set(
      reminders.map(reminder => deadlineTriggerId(reminder.taskId)),
    );
    const stale = pending.filter(id => !wanted.has(id));

    if (stale.length > 0) await notifee.cancelTriggerNotifications(stale);

    // The channel has to exist before anything is scheduled against it: this
    // sweep runs on launches where no activity notification was ever shown, and
    // Android refuses a notification whose channel was never created.
    if (reminders.length > 0) await ensureChannel(language);

    for (const reminder of reminders) {
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: reminder.triggerAtMs,
      };
      const lines = deadlineNotificationLines(
        reminder.title,
        reminder.daysBefore,
        language,
      );

      // Scheduling the same id again replaces it, which is what makes a moved
      // deadline a re-schedule rather than a second notification.
      await notifee.createTriggerNotification(
        {
          id: deadlineTriggerId(reminder.taskId),
          title: lines.title,
          body: lines.body,
          android: {
            channelId: ACTIVITY_CHANNEL_ID,
            pressAction: { id: 'default' },
            smallIcon: 'ic_launcher',
          },
        },
        trigger,
      );
    }

    // Only the tasks still asking for something are remembered, so the record
    // cannot grow with every task that ever had a deadline.
    const nextSpoken: SpokenMornings = {};
    for (const reminder of desiredReminders(tasks, nowMs)) {
      const previous = spoken[reminder.taskId];

      if (previous != null) nextSpoken[reminder.taskId] = previous;
    }
    for (const reminder of reminders) {
      if (reminder.isLate) nextSpoken[reminder.taskId] = reminder.identity;
    }

    await AsyncStorage.setItem(SPOKEN_KEY, JSON.stringify(nextSpoken));
  } catch {
    // A phone that cannot schedule keeps its tasks: the reminder is the part
    // that is lost, and the next commit tries again.
  }
}

/** Drops every reminder this app is holding, used when the data behind them
 * is no longer this device's to warn about. */
export async function cancelAllDeadlineReminders(): Promise<void> {
  try {
    const pending = (await notifee.getTriggerNotificationIds()).filter(id =>
      id.startsWith(DEADLINE_TRIGGER_PREFIX),
    );

    if (pending.length > 0) await notifee.cancelTriggerNotifications(pending);
  } catch {
    // Same reasoning as above: nothing here is worth an error in front of
    // somebody.
  }
}
