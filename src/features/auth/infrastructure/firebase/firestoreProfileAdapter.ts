import { getApp } from '@react-native-firebase/app';
import { getAuth, updateProfile } from '@react-native-firebase/auth';

import {
  FirestoreRestError,
  firestoreCommit,
  firestoreDocument,
  type FirestoreWrite,
} from '../../../tasks/infrastructure/sharing/firestoreRest';
import type { ProfilePort } from '../../application/ports/ProfilePort';
import { ProfileOperationError } from '../../domain/ProfileError';
import { normalizeHandle } from '../../domain/UserProfile';

/** One document per account, readable by anyone signed in (a member has to be
 * able to read who the other people in a project are) and writable only by
 * its owner. */
const USERS = 'users';
/** One document per handle, holding nothing but the uid that reserved it.
 * Being a document id is what makes the handle unique. */
const USERNAMES = 'usernames';

function toProfileError(error: unknown): ProfileOperationError {
  if (error instanceof FirestoreRestError) {
    if (error.kind === 'precondition-failed') {
      return new ProfileOperationError('handle-taken');
    }
    if (error.kind === 'unauthenticated') {
      return new ProfileOperationError('forbidden');
    }
    if (error.kind === 'forbidden') {
      return new ProfileOperationError('refused');
    }
  }

  return new ProfileOperationError('network');
}

/** The photo the provider already knows about, written into the profile so
 * every other member reads it from the same place as the name. Returns null
 * when the account has no provider photo, or when the write did not land —
 * a photo is never worth failing a profile read over. */
async function adoptProviderPhoto(uid: string): Promise<string | null> {
  const user = getAuth(getApp()).currentUser;
  const fromProvider = user?.uid === uid ? user?.photoURL ?? null : null;
  if (fromProvider == null || fromProvider.length === 0) return null;

  try {
    await firestoreProfileAdapter.savePhotoURL(uid, fromProvider);
  } catch {
    // Showing the provider's photo does not depend on it being stored: the
    // next read tries again.
  }

  return fromProvider;
}

export const firestoreProfileAdapter: ProfilePort = {
  async load(uid) {
    try {
      const { status, fields } = await firestoreDocument(`${USERS}/${uid}`);
      if (status === 404 || fields == null) return null;

      const displayName =
        typeof fields.displayName === 'string' ? fields.displayName.trim() : '';
      const handle =
        typeof fields.handle === 'string' ? normalizeHandle(fields.handle) : '';

      if (displayName.length === 0 || handle.length === 0) return null;

      const stored =
        typeof fields.photoURL === 'string' && fields.photoURL.length > 0
          ? fields.photoURL
          : null;
      // A Google account arrives with a photo already: it becomes the profile
      // photo without anybody being asked. Only ever when the field is empty,
      // so a photo the person uploaded is never overwritten by the provider.
      const photoURL =
        stored ?? (await adoptProviderPhoto(uid).catch(() => null));

      return { uid, displayName, handle, photoURL };
    } catch (error) {
      throw toProfileError(error);
    }
  },

  async savePhotoURL(uid, photoURL) {
    try {
      await firestoreCommit([
        {
          kind: 'update',
          path: `${USERS}/${uid}`,
          fields: { photoURL, updatedAtMs: Date.now() },
          updateMask: ['photoURL', 'updatedAtMs'],
        },
      ]);
    } catch (error) {
      throw toProfileError(error);
    }
  },

  async save({ uid, displayName, handle, previousHandle, photoURL }) {
    const name = displayName.trim();
    const wanted = normalizeHandle(handle);
    // A caller that does not know the current handle (the profile failed to
    // load, say) would otherwise leave the old reservation locked to this uid
    // forever, so the stored one is read before deciding what to release.
    const known =
      previousHandle != null && photoURL !== undefined
        ? null
        : await firestoreProfileAdapter.load(uid).catch(() => null);
    const previous =
      previousHandle != null
        ? normalizeHandle(previousHandle)
        : known?.handle ?? null;
    const writes: FirestoreWrite[] = [];

    if (previous !== wanted) {
      // `exists: false` is the whole reservation: two people sending the same
      // handle at the same time, only one commit lands.
      writes.push({
        kind: 'update',
        path: `${USERNAMES}/${wanted}`,
        fields: { uid, updatedAtMs: Date.now() },
        requireExists: false,
      });

      if (previous != null) {
        // No precondition: deleting a reservation that is not there is a
        // no-op, and refusing the whole commit over it would leave somebody
        // unable to ever change their handle.
        writes.push({ kind: 'delete', path: `${USERNAMES}/${previous}` });
      }
    }

    // The photo travels only when the caller knows it: an update mask without
    // `photoURL` leaves whatever is stored exactly as it is.
    const photoFields =
      photoURL === undefined ? {} : { photoURL: photoURL ?? null };

    writes.push({
      kind: 'update',
      path: `${USERS}/${uid}`,
      fields: {
        displayName: name,
        handle: wanted,
        updatedAtMs: Date.now(),
        ...photoFields,
      },
      updateMask: [
        'displayName',
        'handle',
        'updatedAtMs',
        ...(photoURL === undefined ? [] : ['photoURL']),
      ],
    });

    try {
      await firestoreCommit(writes);
    } catch (error) {
      throw toProfileError(error);
    }

    // The provider's own profile stays in step so anything reading the session
    // (member rows, the day band) shows the same name without a second read.
    const user = getAuth(getApp()).currentUser;
    if (user != null && user.displayName !== name) {
      try {
        await updateProfile(user, { displayName: name });
      } catch {
        // The name that matters is already saved; the provider copy catching
        // up is not worth failing a save the person just confirmed.
      }
    }

    return {
      uid,
      displayName: name,
      handle: wanted,
      // A save that said nothing about the photo left the stored one alone:
      // what comes back says the same thing the document does.
      photoURL: photoURL === undefined ? known?.photoURL ?? null : photoURL,
    };
  },
};
