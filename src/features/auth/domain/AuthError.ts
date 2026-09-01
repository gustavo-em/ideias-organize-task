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
