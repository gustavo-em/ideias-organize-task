import { useEffect } from 'react';

import { readLocalWorkspace } from '../../features/tasks/infrastructure/storage/asyncStorageStores';
import type { WorkspaceBackupGateway } from '../../features/tasks/infrastructure/storage/firestoreWorkspaceBackup';
import type { TaskEventBus } from '../../features/tasks/domain/TaskEvent';

/** Held back much longer than the disk write, which runs at 400ms. A morning
 * of ticking boxes should cost a handful of uploads, not one per tap, and the
 * device is the copy that has to be current — this one only has to be recent
 * enough to survive a reinstall. */
const BACKUP_DEBOUNCE_MS = 4000;

/**
 * Keeping the server copy of the workspace behind the device's.
 *
 * Reads back from AsyncStorage rather than from the event, so what goes up is
 * exactly what the device has — the same bytes the restore will write back,
 * with no second opinion about how a workspace is serialized.
 *
 * Every failure is swallowed. A backup that cannot be written is not something
 * to interrupt anybody over: the app has already saved to disk, and the next
 * commit tries again.
 */
export function useWorkspaceBackup(
  personId: string | null,
  backup: WorkspaceBackupGateway,
  bus: TaskEventBus,
) {
  useEffect(() => {
    if (personId == null) return undefined;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let running = false;

    async function upload(): Promise<void> {
      // Two uploads of the same account racing each other would have the
      // slower one land last and win with older bytes.
      if (running || personId == null) return;
      running = true;

      try {
        await backup.save(personId, await readLocalWorkspace(personId));
      } catch {
        // The device keeps the workspace either way.
      } finally {
        running = false;
      }
    }

    const unsubscribe = bus.on('workspace.committed', () => {
      if (timer != null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        upload().catch(() => undefined);
      }, BACKUP_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();

      if (timer != null) {
        clearTimeout(timer);
        // Closing the app is exactly when the last change most needs to be
        // somewhere other than this device.
        upload().catch(() => undefined);
      }
    };
  }, [backup, bus, personId]);
}
