import { getApp } from '@react-native-firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from '@react-native-firebase/auth';

import type { AuthPort } from '../../application/ports/AuthPort';
import { AuthOperationError, type AuthErrorKind } from '../../domain/AuthError';
import type { AuthUser } from '../../domain/AuthUser';

// Resolved on first use, not at module load: the JS bundle can evaluate
// before the native default Firebase app finishes registering, and calling
// `getAuth()` at import time in that window throws — which left this whole
// module's export undefined and crashed the app before a single screen drew.
// `getApp()` is passed explicitly rather than relying on `getAuth()`'s own
// default-app lookup, and a fresh attempt is made on every call — a failed
// attempt is never cached, so a slow cold start can still recover.
let cachedAuth: Auth | null = null;

function auth(): Auth {
  if (cachedAuth == null) cachedAuth = getAuth(getApp());

  return cachedAuth;
}

/** Firebase's own codes, narrowed down to the ones the copy layer tells
 * apart. Everything else — including codes Firebase adds later — falls back
 * to `unknown` rather than leaking a provider string onto a screen. */
function toErrorKind(code: string | undefined): AuthErrorKind {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'invalid-credential';
    case 'auth/network-request-failed':
      return 'network';
    case 'auth/email-already-in-use':
      return 'email-in-use';
    // Firebase's own anti-abuse throttle, not a bug in the form: the fix is
    // to wait, never to retry automatically or treat it as a generic error.
    case 'auth/too-many-requests':
      return 'too-many-requests';
    default:
      return 'unknown';
  }
}

function toDomainUser(user: User | null): AuthUser | null {
  if (user == null) return null;

  return { uid: user.uid, email: user.email, displayName: user.displayName };
}

async function run(operation: () => Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    const code =
      typeof error === 'object' && error != null && 'code' in error
        ? String((error as { code: unknown }).code)
        : undefined;

    throw new AuthOperationError(toErrorKind(code));
  }
}

export const firebaseAuthAdapter: AuthPort = {
  signIn: (email, password) =>
    run(() => signInWithEmailAndPassword(auth(), email, password)),
  signUp: (email, password) =>
    run(() => createUserWithEmailAndPassword(auth(), email, password)),
  sendPasswordReset: email => run(() => sendPasswordResetEmail(auth(), email)),
  signOut: () => run(() => signOut(auth())),
  onAuthStateChanged: listener => subscribeToAuthState(listener),
};

const SUBSCRIBE_RETRY_DELAY_MS = 300;
const SUBSCRIBE_MAX_ATTEMPTS = 10;

/**
 * The native bridge can still be finishing registration on a very cold
 * start, so the first attempt to subscribe can throw. That must not crash
 * the shell before a single screen draws, but it also must not settle on
 * "signed out" forever — a saved session has to still open straight into the
 * app once the bridge catches up, so a failed attempt keeps retrying on a
 * short timer instead of giving up after one try.
 */
function subscribeToAuthState(
  listener: (user: AuthUser | null) => void,
): () => void {
  let unsubscribeReal: (() => void) | null = null;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;
  let hasReportedFallback = false;

  function attempt(attemptsLeft: number) {
    if (cancelled) return;

    try {
      unsubscribeReal = onAuthStateChanged(auth(), user =>
        listener(toDomainUser(user)),
      );
    } catch {
      // Report the safe default once, so the shell can still show a screen
      // while retries continue in the background — never an infinite wait.
      if (!hasReportedFallback) {
        hasReportedFallback = true;
        listener(null);
      }

      if (attemptsLeft <= 0) return;

      retryTimeout = setTimeout(
        () => attempt(attemptsLeft - 1),
        SUBSCRIBE_RETRY_DELAY_MS,
      );
    }
  }

  attempt(SUBSCRIBE_MAX_ATTEMPTS);

  return () => {
    cancelled = true;
    if (retryTimeout != null) clearTimeout(retryTimeout);
    unsubscribeReal?.();
  };
}
