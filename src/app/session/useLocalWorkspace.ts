import { useEffect, useState } from 'react';

import {
  adoptLegacyTaskData,
  isLocalWorkspaceEmpty,
  writeLocalWorkspace,
} from '../../features/tasks/infrastructure/storage/asyncStorageStores';
import type { WorkspaceBackupGateway } from '../../features/tasks/infrastructure/storage/firestoreWorkspaceBackup';

export type LocalWorkspaceStatus = 'checking' | 'ready';

/**
 * Getting this account's workspace onto the device before anything is drawn.
 *
 * Three things happen here, in order, and the screens wait behind `checking`
 * until they are done — a task painted for one frame and then replaced by a
 * restore reads as the app losing the day.
 *
 * 1. The pre-namespace keys are handed to the account that owned them, once
 *    per device.
 * 2. If this account has nothing here, the server backup is pulled down. This
 *    is what makes signing out and back in — or arriving on a new phone —
 *    return the workspace instead of an empty app.
 * 3. Ready. Nothing is ever erased on the way in: two accounts on one phone
 *    keep two sets, each under its own key.
 *
 * The restore is deliberately one-way and only into emptiness. A device that
 * already has this account's data is the newer copy by definition — it is
 * where the person has been working.
 */
export function useLocalWorkspace(
  personId: string | null,
  backup: WorkspaceBackupGateway,
) {
  const [status, setStatus] = useState<LocalWorkspaceStatus>('checking');

  useEffect(() => {
    let active = true;

    if (personId == null) {
      setStatus('ready');
      return () => {
        active = false;
      };
    }

    setStatus('checking');

    (async () => {
      try {
        await adoptLegacyTaskData(personId);

        if (await isLocalWorkspaceEmpty(personId)) {
          const restored = await backup.load(personId);

          if (restored != null) await writeLocalWorkspace(personId, restored);
        }
      } catch {
        // Storage or network that cannot answer is not a reason to hold the
        // app shut. The screens open on whatever the device does have, and
        // the next save puts the workspace back on the server.
      }

      if (active) setStatus('ready');
    })();

    return () => {
      active = false;
    };
  }, [backup, personId]);

  return status;
}
