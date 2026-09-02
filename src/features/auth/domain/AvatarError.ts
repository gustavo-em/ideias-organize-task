export type AvatarErrorKind =
  /** The bucket is not there yet: the owner has not enabled Cloud Storage.
   * The app keeps working with the provider photo or the initials. */
  | 'storage-unavailable'
  /** A security rule said no, or the session is not usable for this write. */
  | 'forbidden'
  | 'network';

/** Everything the avatar upload can answer, in the app's own words. The
 * transport's error shape never leaves the adapter. */
export class AvatarOperationError extends Error {
  constructor(readonly kind: AvatarErrorKind) {
    super(kind);
    this.name = 'AvatarOperationError';
  }
}
