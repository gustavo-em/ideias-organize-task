import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';

import type { ActivityNotifier } from '../../application/ports/ActivityNotifier';
import {
  activityEventKey,
  type ProjectActivityEvent,
} from '../../domain/ProjectActivity';
import {
  activityNotificationLines,
  activitySummaryLine,
  getActivityNotificationCopy,
} from '../../presentation/localization/activityNotificationCopy';
import type { AppLanguage } from '../../presentation/localization/taskCopy';

export const ACTIVITY_CHANNEL_ID = 'project-activity';

/** Beyond this, one project's pull turns into a single summary line. Three
 * facts fit in the tray; ten are a wall nobody reads. */
const MAX_INDIVIDUAL = 3;

export async function ensureChannel(language: AppLanguage): Promise<string> {
  const copy = getActivityNotificationCopy(language);

  // Creating an existing channel updates its name only: Android owns the
  // importance from the moment the channel first exists.
  return notifee.createChannel({
    id: ACTIVITY_CHANNEL_ID,
    name: copy.channelName,
    description: copy.channelDescription,
    importance: AndroidImportance.DEFAULT,
  });
}

function byToken(
  events: readonly ProjectActivityEvent[],
): Map<string, ProjectActivityEvent[]> {
  const grouped = new Map<string, ProjectActivityEvent[]>();

  for (const event of events) {
    const bucket = grouped.get(event.token);
    if (bucket == null) grouped.set(event.token, [event]);
    else bucket.push(event);
  }

  return grouped;
}

export const notifeeActivityNotifier: ActivityNotifier = {
  async isAllowed() {
    try {
      const settings = await notifee.getNotificationSettings();

      return (
        settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
      );
    } catch {
      // A phone that cannot answer is treated as one that did not allow it:
      // nothing is shown, and nothing crashes.
      return false;
    }
  },

  async present(events, language) {
    if (events.length === 0) return;

    const channelId = await ensureChannel(language);

    for (const [token, group] of byToken(events)) {
      const lines =
        group.length > MAX_INDIVIDUAL
          ? [
              {
                // A summary replaces itself instead of stacking: the same
                // project cannot end up with two piles in the tray.
                id: `${ACTIVITY_CHANNEL_ID}.${token}.summary`,
                ...activitySummaryLine(group, language),
              },
            ]
          : group.map(event => ({
              // The event's own key as the notification id: even if two runs
              // somehow reached this point with the same fact, Android shows
              // one line, not two.
              id: activityEventKey(event),
              ...activityNotificationLines(event, language),
            }));

      for (const line of lines) {
        await notifee.displayNotification({
          id: line.id,
          title: line.title,
          body: line.body,
          android: {
            channelId,
            // One group per project, so two projects never braid their lines
            // together in the tray.
            groupId: `${ACTIVITY_CHANNEL_ID}.${token}`,
            pressAction: { id: 'default' },
            smallIcon: 'ic_launcher',
          },
        });
      }
    }
  },
};

/**
 * One line the server already worded (Layer B), shown with the same channel
 * and grouping as the local ones. The caller has already claimed the event's
 * key in the ledger, so the sync layer will not repeat it.
 */
export async function presentActivityLine(
  line: { id: string; token: string; title: string; body: string },
  language: AppLanguage,
): Promise<void> {
  const channelId = await ensureChannel(language);

  await notifee.displayNotification({
    id: line.id,
    title: line.title,
    body: line.body,
    android: {
      channelId,
      groupId: `${ACTIVITY_CHANNEL_ID}.${line.token}`,
      pressAction: { id: 'default' },
      smallIcon: 'ic_launcher',
    },
  });
}

/**
 * Asking for the permission, once, where it makes sense — never on a cold
 * start. A refusal is final here: the caller records that it asked and does
 * not ask again on its own.
 */
/** The system screen where a refusal can be undone. Once Android has been told
 * no, the app cannot ask again — this is the only way back. */
export async function openSystemNotificationSettings(): Promise<void> {
  try {
    await notifee.openNotificationSettings(ACTIVITY_CHANNEL_ID);
  } catch {
    // Nothing to open on this platform: the switch simply stays as it is.
  }
}

export async function requestActivityPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();

    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}
