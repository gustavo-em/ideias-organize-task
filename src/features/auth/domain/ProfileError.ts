export type ProfileErrorKind =
  | 'handle-taken'
  /** A security rule refused the write: the account is fine, the server said
   * no. Never phrased as "log in again". */
  | 'refused'
  | 'network'
  /** No usable session: signing in again is the actual next step. */
  | 'forbidden';

/** Everything that can go wrong while reserving a handle, in the app's own
 * words. The transport's error shape never leaves the adapter. */
export class ProfileOperationError extends Error {
  constructor(readonly kind: ProfileErrorKind) {
    super(kind);
    this.name = 'ProfileOperationError';
  }
}
