import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { reportProjectActivity } from '../../application/useCases/checkProjectActivity';
import type { Task } from '../../domain/Task';
import type { TaskList } from '../../domain/TaskList';
import { asyncStorageActivityLedger } from '../../infrastructure/notifications/asyncStorageActivityLedger';
import { configureBackgroundActivitySync } from '../../infrastructure/notifications/backgroundActivitySync';
import {
  registerFcmHandlers,
  registerFcmToken,
} from '../../infrastructure/notifications/fcmTokenRegistry';
import {
  notifeeActivityNotifier,
  openSystemNotificationSettings,
  requestActivityPermission,
} from '../../infrastructure/notifications/notifeeActivityNotifier';
import type { AppLanguage } from '../localization/taskCopy';

interface ProjectActivityOptions {
  /** The "Notificações do projeto" setting. */
  enabled: boolean;
  language: AppLanguage;
  /** Null until the session resolves; nothing runs without an account. */
  personId: string | null;
  onPermissionAsked: () => void;
  onEnabledChange: (enabled: boolean) => void;
}

/**
 * The shell's side of project notifications.
 *
 * It keeps the view model free of any of this: the pull it already does hands
 * the project over here, and this decides whether there is news worth showing.
 */
export function useProjectActivity({
  enabled,
  language,
  personId,
  onPermissionAsked,
  onEnabledChange,
}: ProjectActivityOptions) {
  // A ref, not a dependency: the callback handed to the view model has to stay
  // stable across renders, but always read the settings as they are now.
  const deps = useRef({ enabled, language, personId });
  deps.current = { enabled, language, personId };

  const onRemoteProject = useCallback(
    (remote: { list: TaskList; tasks: readonly Task[] }) => {
      const { personId: meId, ...rest } = deps.current;
      if (meId == null) return;

      reportProjectActivity(remote, {
        ledger: asyncStorageActivityLedger,
        notifier: notifeeActivityNotifier,
        language: rest.language,
        meId,
        enabled: rest.enabled,
      }).catch(() => undefined);
    },
    [],
  );

  // Layer A+ and the client half of Layer B start once there is an account to
  // check projects for.
  useEffect(() => {
    if (personId == null) return;

    configureBackgroundActivitySync();

    return registerFcmHandlers();
  }, [personId]);

  /** What the system itself says, not what the app remembers asking. Settings
   * shows it, and the switch decides by it. */
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  const refreshPermission = useCallback(async () => {
    const allowed = await notifeeActivityNotifier.isAllowed();
    setIsAllowed(allowed);

    return allowed;
  }, []);

  useEffect(() => {
    if (personId == null) return;

    refreshPermission().catch(() => undefined);
  }, [personId, refreshPermission]);

  /** The one place the permission is asked for: a shared project on screen, or
   * the switch in settings. Never a cold start, and never twice on its own. */
  const enableNotifications = useCallback(async () => {
    onPermissionAsked();

    const granted = await requestActivityPermission();
    setIsAllowed(granted);
    if (granted) await registerFcmToken();

    return granted;
  }, [onPermissionAsked]);

  /** Turning the setting back on starts from silence: the ledger is cleared so
   * the next pull records what is already there instead of announcing every
   * fact from the time it was off.
   *
   * Whether to ask for the permission is decided by the system's own answer,
   * never by the flag that only remembers whether the inline line was shown:
   * a switch turned on that can never notify is worse than one more prompt. */
  const setEnabled = useCallback(
    (next: boolean) => {
      onEnabledChange(next);

      if (!next) return;

      asyncStorageActivityLedger
        .reset()
        .then(() => refreshPermission())
        .then(allowed => (allowed ? null : enableNotifications()))
        .catch(() => undefined);
    },
    [enableNotifications, onEnabledChange, refreshPermission],
  );

  /** Sending the person to the only place a refusal can be undone, and reading
   * the answer again when they come back. */
  const openSystemSettings = useCallback(() => {
    openSystemNotificationSettings().catch(() => undefined);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshPermission().catch(() => undefined);
    });

    return () => subscription.remove();
  }, [refreshPermission]);

  return {
    onRemoteProject,
    enableNotifications,
    setEnabled,
    /** Null while the system has not answered yet: settings says nothing
     * rather than accusing the person of having blocked anything. */
    isAllowed,
    openSystemSettings,
  };
}
