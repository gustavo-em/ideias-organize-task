import {
  FirestoreRestError,
  firestoreDocument,
} from '../sharing/firestoreRest';

/**
 * A copy of one account's workspace, kept server-side.
 *
 * The device is still where the app reads and writes: every screen runs off
 * AsyncStorage, and this never sits in front of a save. It exists for the
 * three moments the device cannot answer — a new phone, a reinstall, and the
 * one that was reported: signing out and back in. Before it, leaving the
 * account was indistinguishable from losing everything in it.
 *
 * Written whole, not merged. Two phones editing the same account will have the
 * last one to write win, which is the honest limit of a backup that is not a
 * sync — the restore only ever runs when the device has nothing of its own.
 */

/** One document per account. A whole workspace fits comfortably under the
 * 1 MiB document ceiling for any plausible number of tasks; a workspace that
 * did not would fail the write, and the device keeps working regardless. */
function pathFor(personId: string): string {
  return `users/${personId}/workspace/current`;
}

export interface WorkspaceSnapshot {
  tasks: unknown;
  lists: unknown;
  progress: unknown;
  trio: unknown;
  groupStreaks: unknown;
}

const FIELDS: readonly (keyof WorkspaceSnapshot)[] = [
  'tasks',
  'lists',
  'progress',
  'trio',
  'groupStreaks',
];

/**
 * Firestore has no array-of-arrays and no undefined, and the workspace is a
 * nested shape this file has no business knowing. Storing each part as a JSON
 * string keeps the backup faithful to whatever the stores wrote, and keeps
 * this file from having to be updated every time a task grows a field.
 */
export interface WorkspaceBackupGateway {
  save(personId: string, snapshot: WorkspaceSnapshot): Promise<void>;
  load(personId: string): Promise<Partial<WorkspaceSnapshot> | null>;
}

export const firestoreWorkspaceBackup: WorkspaceBackupGateway = {
  async save(personId, snapshot) {
    const fields: Record<string, unknown> = { updatedAtMs: Date.now() };

    for (const field of FIELDS) {
      // A part the device has nothing for is written as an empty string
      // rather than left out: the backup is the whole workspace, so a missing
      // key has to mean "this account has none", not "this write forgot it".
      fields[field] =
        snapshot[field] == null ? '' : JSON.stringify(snapshot[field]);
    }

    await firestoreDocument(pathFor(personId), {
      method: 'PATCH',
      fields,
      updateMask: [...FIELDS, 'updatedAtMs'],
    });
  },

  async load(personId) {
    try {
      const { status, fields } = await firestoreDocument(pathFor(personId));

      if (status === 404 || fields == null) return null;

      const restored: Partial<WorkspaceSnapshot> = {};

      for (const field of FIELDS) {
        const raw = fields[field];

        if (typeof raw !== 'string' || raw.length === 0) continue;

        try {
          restored[field] = JSON.parse(raw);
        } catch {
          // One unreadable part does not sink the rest: the workspace is
          // rebuilt from whatever parsed, and the device fills the gaps.
        }
      }

      return restored;
    } catch (error) {
      // A backup that cannot be reached is not an error the app has to show.
      // Opening on an empty device is already the state the person is in; the
      // next save will put the workspace back on the server.
      if (error instanceof FirestoreRestError) return null;
      throw error;
    }
  },
};
