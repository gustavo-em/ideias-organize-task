/**
 * What can go wrong, named by what the screen needs to say — never by the
 * provider's own error code, which is an implementation detail the copy
 * layer should never have to parse.
 */
export type AuthErrorKind =
  | 'invalid-credential'
  | 'network'
  | 'email-in-use'
  | 'too-many-requests'
  /** The person backed out of the provider's own sheet. Not a failure: no
   * screen ever renders a message for this one. */
  | 'cancelled'
  | 'play-services-unavailable'
  | 'provider-unavailable'
  | 'account-exists-with-different-credential'
  /** The session is too old for something Firebase only lets a fresh one do —
   * erasing the account. The way out is signing in again, never retrying. */
  | 'requires-recent-login'
  | 'unknown';

export interface AuthError {
  kind: AuthErrorKind;
}

/** What an `AuthPort` method rejects with. A plain `Error` subclass so a
 * failed promise is still a normal JavaScript error everywhere else. */
export class AuthOperationError extends Error implements AuthError {
  kind: AuthErrorKind;

  constructor(kind: AuthErrorKind) {
    super(`auth error: ${kind}`);
    this.kind = kind;
  }
}
