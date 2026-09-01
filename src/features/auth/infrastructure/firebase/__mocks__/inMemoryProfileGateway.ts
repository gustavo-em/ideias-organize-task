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

    async save({ uid, displayName, handle, previousHandle }: SaveProfileInput) {
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

      const profile: UserProfile = { uid, displayName, handle };
      profiles.set(uid, profile);

      return profile;
    },

    reservations() {
      return Object.fromEntries(usernames);
    },

    reserveFor(handle, uid) {
      usernames.set(handle, uid);
    },
  };
}
