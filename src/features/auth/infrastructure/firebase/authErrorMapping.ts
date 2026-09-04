import type { AuthErrorKind } from '../../domain/AuthError';

/**
 * Every provider reports failure with its own vocabulary. This file is the
 * single place those vocabularies are translated into the kinds the copy
 * layer knows — and it imports no SDK, so the mapping is testable without a
 * native module in the room.
 */

/**
 * Codes the Google Sign-In module rejects with. Two shapes reach here: the
 * module's own string constants, and `GoogleSignInStatusCodes` numbers turned
 * into strings by the Android bridge.
 */
const GOOGLE_CANCELLED = ['12501', 'SIGN_IN_CANCELLED', '-5'];
const GOOGLE_PLAY_SERVICES = [
  'PLAY_SERVICES_NOT_AVAILABLE',
  // SERVICE_MISSING, SERVICE_VERSION_UPDATE_REQUIRED, SERVICE_DISABLED,
  // SERVICE_INVALID, SERVICE_UPDATING, API_NOT_CONNECTED: every one of them
  // means Play Services cannot serve this sign-in on this device.
  '1',
  '2',
  '3',
  '9',
  '16',
  '18',
];
const GOOGLE_NETWORK = ['7'];

/** Apple's `ASAuthorizationError` codes, as strings. */
const APPLE_CANCELLED = ['1001', 'ERR_REQUEST_CANCELED'];

export function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error == null) return undefined;
  if (!('code' in error)) return undefined;

  const code = (error as { code: unknown }).code;

  return code == null ? undefined : String(code);
}

/** Firebase's own codes, narrowed down to the ones the copy layer tells
 * apart. Everything else — including codes Firebase adds later — falls back
 * to `unknown` rather than leaking a provider string onto a screen. */
export function toFirebaseErrorKind(code: string | undefined): AuthErrorKind {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'invalid-credential';
    case 'auth/network-request-failed':
      return 'network';
    // Deleting an account is one of the operations Firebase refuses on a
    // session older than a few minutes, however valid it is.
    case 'auth/requires-recent-login':
      return 'requires-recent-login';
    case 'auth/email-already-in-use':
      return 'email-in-use';
    // Firebase's own anti-abuse throttle, not a bug in the form: the fix is
    // to wait, never to retry automatically or treat it as a generic error.
    case 'auth/too-many-requests':
      return 'too-many-requests';
    case 'auth/account-exists-with-different-credential':
      return 'account-exists-with-different-credential';
    // The owner has not switched this provider on in the console yet. The
    // screen says so plainly and points at email and password instead.
    case 'auth/operation-not-allowed':
    case 'auth/invalid-provider-id':
      return 'provider-unavailable';
    default:
      return 'unknown';
  }
}

export function toGoogleErrorKind(code: string | undefined): AuthErrorKind {
  // A rejection with no code at all still came out of the Google button.
  if (code == null) return 'provider-unavailable';
  if (GOOGLE_CANCELLED.includes(code)) return 'cancelled';
  if (GOOGLE_PLAY_SERVICES.includes(code)) return 'play-services-unavailable';
  if (GOOGLE_NETWORK.includes(code)) return 'network';
  if (code.startsWith('auth/')) return toFirebaseErrorKind(code);

  // Everything else the module can raise — DEVELOPER_ERROR, SIGN_IN_FAILED,
  // NULL_PRESENTER, a numeric status this version does not name — is still a
  // fact about this way in, not about the person or the app in general. The
  // screen says Google is unavailable and points at email and password,
  // instead of the generic "Algo não funcionou".
  return 'provider-unavailable';
}

export function toAppleErrorKind(code: string | undefined): AuthErrorKind {
  if (code == null) return 'unknown';
  if (APPLE_CANCELLED.includes(code)) return 'cancelled';

  return toFirebaseErrorKind(code);
}
