import type {
  ProfilePort,
  SaveProfileInput,
} from '../../../application/ports/ProfilePort';
import { ProfileOperationError } from '../../../domain/ProfileError';
import type { UserProfile } from '../../../domain/UserProfile';

/**
 * A `ProfilePort` with the same rules as the Firestore one, minus the
 * network: `usernames` holds one uid per handle, and taking a handle releases
 * the previous one in the same step — a save either does both or neither.
 */
export function createInMemoryProfileGateway(): ProfilePort & {
  /** What `usernames/{handle}` looks like right now, for assertions. */
  reservations(): Record<string, string>;
  /** Puts a handle in somebody else's hands, to test the taken path. */
  reserveFor(handle: string, uid: string): void;
} {
  const profiles = new Map<string, UserProfile>();
  const usernames = new Map<string, string>();

  return {
    async load(uid) {
      return profiles.get(uid) ?? null;
    },

    async savePhotoURL(uid, photoURL) {
      const stored = profiles.get(uid);
      if (stored == null) return;

      profiles.set(uid, { ...stored, photoURL });
    },

    async save({
      uid,
      displayName,
      handle,
      previousHandle,
      photoURL,
    }: SaveProfileInput) {
      const owner = usernames.get(handle);
      if (owner != null && owner !== uid) {
        throw new ProfileOperationError('handle-taken');
      }

      usernames.set(handle, uid);
      if (previousHandle != null && previousHandle !== handle) {
        if (usernames.get(previousHandle) === uid) {
          usernames.delete(previousHandle);
        }
      }

      const profile: UserProfile = {
        uid,
        displayName,
        handle,
        photoURL:
          photoURL === undefined
            ? profiles.get(uid)?.photoURL ?? null
            : photoURL,
      };
      profiles.set(uid, profile);

      return profile;
    },

    async deleteAccountData(uid, handle) {
      const reserved = handle ?? profiles.get(uid)?.handle ?? null;

      profiles.delete(uid);
      // Same rule the real one obeys: only the uid holding a handle releases
      // it, so a handle that moved on stays with whoever has it now.
      if (reserved != null && usernames.get(reserved) === uid) {
        usernames.delete(reserved);
      }
    },

    reservations() {
      return Object.fromEntries(usernames);
    },

    reserveFor(handle, uid) {
      usernames.set(handle, uid);
    },
  };
}
