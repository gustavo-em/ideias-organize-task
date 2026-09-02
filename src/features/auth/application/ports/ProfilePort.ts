import type { UserProfile } from '../../domain/UserProfile';

export interface SaveProfileInput {
  uid: string;
  displayName: string;
  handle: string;
  /** The handle this account holds right now, so the reservation it no longer
   * needs is released in the same write that takes the new one. Null on the
   * very first save. */
  previousHandle: string | null;
  /** The avatar this account already has, carried through so saving a name
   * never blanks the photo. Undefined leaves whatever is stored alone. */
  photoURL?: string | null;
}

/**
 * Where a profile lives. The reservation of a handle is the whole point of
 * this port: `save` either takes the new handle and releases the old one, or
 * changes nothing at all — never half of it.
 */
export interface ProfilePort {
  load(uid: string): Promise<UserProfile | null>;
  /** Rejects with `ProfileOperationError('handle-taken')` when the handle
   * already belongs to somebody else. */
  save(input: SaveProfileInput): Promise<UserProfile>;
  /** The avatar alone: saved the moment a photo is chosen, never waiting on
   * the name and handle the person may still be typing. Null clears it. */
  savePhotoURL(uid: string, photoURL: string | null): Promise<void>;
}
