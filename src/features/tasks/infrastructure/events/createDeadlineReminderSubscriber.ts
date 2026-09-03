import type { Unsubscribe } from '../../../../shared/events/EventBus';
import type { TaskEventBus } from '../../domain/TaskEvent';
import type { Workspace } from '../../domain/Workspace';
import type { AppLanguage } from '../../presentation/localization/taskCopy';
import { syncDeadlineReminders } from '../notifications/notifeeDeadlineScheduler';
import { syncReminderAlerts } from '../notifications/notifeeReminderScheduler';

interface DeadlineReminderDependencies {
  language: AppLanguage;
  now: () => number;
  /** Same reasoning as the persistence and share subscribers: three ticks in a
   * row should reach the notification centre once. */
  debounceMs?: number;
  sync?: typeof syncDeadlineReminders;
  /** Same sweep, for the reminders: one commit re-states both sets. */
  syncReminders?: typeof syncReminderAlerts;
}

const DEFAULT_DEBOUNCE_MS = 600;

/**
 * Keeps the phone's pending reminders in step with the tasks.
 *
 * Every committed change re-states the whole desired set, so nothing here has
 * to know whether a date moved, a task was finished or one was deleted: the
 * scheduler compares and cancels what nobody asks for any more.
 */
export function createDeadlineReminderSubscriber(
  bus: TaskEventBus,
  dependencies: DeadlineReminderDependencies,
): Unsubscribe {
  const {
    language,
    now,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    sync = syncDeadlineReminders,
    syncReminders = syncReminderAlerts,
  } = dependencies;

  let pending: Workspace | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush(): void {
    timer = null;

    const workspace = pending;
    if (workspace == null) return;

    pending = null;

    const atMs = now();

    sync(workspace.tasks, atMs, language).catch(() => undefined);
    syncReminders(workspace.tasks, atMs, language).catch(() => undefined);
  }

  const unsubscribe = bus.on('workspace.committed', event => {
    pending = event.workspace;

    if (timer != null) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  });

  return () => {
    unsubscribe();

    if (timer != null) {
      clearTimeout(timer);
      flush();
    }
  };
}
