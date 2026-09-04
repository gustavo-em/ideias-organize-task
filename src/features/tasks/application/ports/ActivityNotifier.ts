import type { AppLanguage } from '../../presentation/localization/taskCopy';
import type { ProjectActivityEvent } from '../../domain/ProjectActivity';

/**
 * How news about a shared project reaches the phone's tray.
 *
 * The use case never knows whether it is Notifee, a stub in a test, or
 * nothing at all: it asks whether it may speak and hands over the facts.
 */
export interface ActivityNotifier {
  /** Whether the person has allowed notifications. False is not an error: the
   * events are still recorded so granting the permission later does not empty
   * months of history into the tray. */
  isAllowed(): Promise<boolean>;
  present(
    events: readonly ProjectActivityEvent[],
    language: AppLanguage,
  ): Promise<void>;
}
