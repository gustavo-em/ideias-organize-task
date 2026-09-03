import notifee, {
  AuthorizationStatus,
  TriggerType,
  type TimestampTrigger,
} from '@notifee/react-native';

import { desiredReminderAlerts } from '../../domain/Reminder';
import type { Task } from '../../domain/Task';
import { reminderNotificationLines } from '../../presentation/localization/reminderNotificationCopy';
import type { AppLanguage } from '../../presentation/localization/taskCopy';
import { ACTIVITY_CHANNEL_ID, ensureChannel } from './notifeeActivityNotifier';

/** Every reminder alert this app schedules carries this prefix, so a sweep can
 * tell its own pending triggers apart from the deadline warnings and from
 * anything else the phone happens to hold. */
export const REMINDER_TRIGGER_PREFIX = 'reminder-item.';

/** One id per occurrence held ahead: the same future produces the same ids, so
 * a second sync replaces rather than duplicates. */
export function reminderTriggerId(taskId: string, index: number): string {
  return `${REMINDER_TRIGGER_PREFIX}${taskId}.${index}`;
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
 * Makes the phone hold exactly the alerts the reminders ask for.
 *
 * Notifee can repeat by hour, day or week and by nothing else, so a monthly
 * bill and a birthday are kept as a handful of timestamps computed ahead
 * instead. Every commit and every launch re-states the whole desired set, which
 * both re-arms what has already fired and cancels what nobody asks for any
 * more. Nothing here throws: a phone that will not schedule stays quiet, it
 * never takes the app down with it.
 */
export async function syncReminderAlerts(
  tasks: readonly Task[],
  nowMs: number,
  language: AppLanguage,
): Promise<void> {
  try {
    const pending = (await notifee.getTriggerNotificationIds()).filter(id =>
      id.startsWith(REMINDER_TRIGGER_PREFIX),
    );

    if (!(await isAllowed())) {
      // Permission was refused or taken away: what is still pending goes with
      // it, so nothing survives the person saying no.
      if (pending.length > 0) await notifee.cancelTriggerNotifications(pending);
      return;
    }

    const alerts = desiredReminderAlerts(tasks, nowMs);
    const wanted = new Set(
      alerts.map(alert => reminderTriggerId(alert.taskId, alert.index)),
    );
    const stale = pending.filter(id => !wanted.has(id));

    if (stale.length > 0) await notifee.cancelTriggerNotifications(stale);

    // The channel has to exist before anything is scheduled against it: this
    // sweep runs on launches where no notification was ever shown, and Android
    // refuses one whose channel was never created.
    if (alerts.length > 0) await ensureChannel(language);

    for (const alert of alerts) {
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: alert.triggerAtMs,
      };
      const lines = reminderNotificationLines(alert.title, language);

      await notifee.createTriggerNotification(
        {
          id: reminderTriggerId(alert.taskId, alert.index),
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
  } catch {
    // A phone that cannot schedule keeps its reminders: the alert is the part
    // that is lost, and the next commit tries again.
  }
}

/** Drops every reminder alert this app is holding, used when the data behind
 * them is no longer this device's to speak about. */
export async function cancelAllReminderAlerts(): Promise<void> {
  try {
    const pending = (await notifee.getTriggerNotificationIds()).filter(id =>
      id.startsWith(REMINDER_TRIGGER_PREFIX),
    );

    if (pending.length > 0) await notifee.cancelTriggerNotifications(pending);
  } catch {
    // Same reasoning as above: nothing here is worth an error in front of
    // somebody.
  }
}
