import { useEffect, useState } from 'react';

import {
  clearLocalTaskData,
  readDataOwner,
  writeDataOwner,
} from '../../features/tasks/infrastructure/storage/asyncStorageStores';

export type LocalDataOwnerStatus = 'checking' | 'ready';

/**
 * The device's data has one owner at a time.
 *
 * Before anything of the previous session can be drawn, the stored owner is
 * compared with the account that just signed in: a different account starts
 * empty rather than reading somebody else's day. The screens stay behind
 * `checking` until that answer exists, so no other person's task is ever
 * painted for a frame.
 */
export function useLocalDataOwner(personId: string | null) {
  const [status, setStatus] = useState<LocalDataOwnerStatus>('checking');

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
        const owner = await readDataOwner();

        if (owner !== personId) {
          await clearLocalTaskData();
          await writeDataOwner(personId);
        }
      } catch {
        // Storage that cannot say who the data belongs to is storage that
        // cannot promise it belongs to this account: the unknown owner is
        // wiped rather than shown. Opening empty costs a restore; opening
        // somebody else's day costs their privacy.
        try {
          await clearLocalTaskData();
          await writeDataOwner(personId);
        } catch {
          // Nothing else to try here: the screens open with whatever the
          // failing storage manages to return, which is nothing.
        }
      }

      if (active) setStatus('ready');
    })();

    return () => {
      active = false;
    };
  }, [personId]);

  return status;
}
