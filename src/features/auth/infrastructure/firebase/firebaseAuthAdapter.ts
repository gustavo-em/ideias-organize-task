import { Alert, Platform } from 'react-native';
import appleAuth from '@invertase/react-native-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getApp } from '@react-native-firebase/app';
import {
  AppleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from '@react-native-firebase/auth';

import type {
  AccountProvider,
  AuthPort,
} from '../../application/ports/AuthPort';
import { AuthOperationError } from '../../domain/AuthError';
import type { AuthUser } from '../../domain/AuthUser';
import {
  readErrorCode,
  toAppleErrorKind,
  toFirebaseErrorKind,
  toGoogleErrorKind,
} from './authErrorMapping';
import { GOOGLE_WEB_CLIENT_ID } from './googleAuthConfig';

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

let isGoogleConfigured = false;

function configureGoogleOnce(): void {
  if (isGoogleConfigured) return;

  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  isGoogleConfigured = true;
}

function toDomainUser(user: User | null): AuthUser | null {
  if (user == null) return null;

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
  };
}

/** The live listeners handed out by `onAuthStateChanged`. Firebase does not
 * emit on a profile edit, so the anonymous flow needs a way to push the
 * freshly named user to exactly the same subscribers, and to no one who has
 * already unsubscribed. */
const listeners = new Set<(user: AuthUser | null) => void>();

function emitCurrentUser(): void {
  const user = toDomainUser(auth().currentUser);

  listeners.forEach(listener => listener(user));
}

async function run(operation: () => Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    throw new AuthOperationError(toFirebaseErrorKind(readErrorCode(error)));
  }
}

/** The chooser, and the token it hands back. Signing in and proving the same
 * account again before erasing it are the same conversation with Google, so
 * they ask for it in the same place. */
async function googleIdToken(): Promise<string> {
  configureGoogleOnce();

  // Never opens the "update Play Services" dialog: on a device without it
  // the screen already says what to do, and a system dialog on top of that
  // is a second thing to dismiss.
  await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: false,
  });

  const response = await GoogleSignin.signIn();

  // Backing out of the account chooser resolves, it does not reject.
  if (response.type === 'cancelled') {
    throw new AuthOperationError('cancelled');
  }

  const idToken = response.data.idToken;

  if (idToken == null) throw new AuthOperationError('provider-unavailable');

  return idToken;
}

async function signInWithGoogle(): Promise<void> {
  try {
    const idToken = await googleIdToken();

    await signInWithCredential(auth(), GoogleAuthProvider.credential(idToken));
  } catch (error) {
    if (error instanceof AuthOperationError) throw error;

    Alert.alert(
      'DIAG google',
      JSON.stringify(error, Object.getOwnPropertyNames(Object(error))).slice(
        0,
        900,
      ),
    );
    throw new AuthOperationError(toGoogleErrorKind(readErrorCode(error)));
  }
}

/** Apple's sheet, and what comes back from it. Same reason as the Google one:
 * erasing an account asks Apple the very same question. */
async function appleAuthorization(): Promise<{
  identityToken: string;
  nonce: string;
  fullName: string;
}> {
  if (Platform.OS !== 'ios' || !appleAuth.isSupported) {
    throw new AuthOperationError('provider-unavailable');
  }

  const response = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
  });

  // Apple answered without a token: not a cancellation — that arrives as
  // error 1001 — so it has to reach the screen as a real failure.
  if (response.identityToken == null) {
    throw new AuthOperationError('provider-unavailable');
  }

  return {
    identityToken: response.identityToken,
    nonce: response.nonce,
    // Apple hands the name over on the first authorization only.
    fullName: [response.fullName?.givenName, response.fullName?.familyName]
      .filter(part => part != null && part.trim().length > 0)
      .join(' ')
      .trim(),
  };
}

async function signInWithApple(): Promise<void> {
  try {
    const authorization = await appleAuthorization();

    await signInWithCredential(
      auth(),
      AppleAuthProvider.credential(
        authorization.identityToken,
        authorization.nonce,
      ),
    );

    // The name Apple gave is stored on the Firebase profile right away or it
    // is lost for good: the second authorization never carries it.
    const fullName = authorization.fullName;
    const user = auth().currentUser;

    if (fullName.length > 0 && user != null && user.displayName == null) {
      await updateProfile(user, { displayName: fullName });
      await reload(user);
      emitCurrentUser();
    }
  } catch (error) {
    if (error instanceof AuthOperationError) throw error;

    Alert.alert(
      'DIAG apple',
      JSON.stringify(error, Object.getOwnPropertyNames(Object(error))).slice(
        0,
        900,
      ),
    );
    throw new AuthOperationError(toAppleErrorKind(readErrorCode(error)));
  }
}

async function signInWithName(displayName: string): Promise<void> {
  try {
    const credential = await signInAnonymously(auth());

    try {
      await updateProfile(credential.user, { displayName });
      await reload(credential.user);
    } catch (profileError) {
      // The session already exists at this point and Firebase has already
      // told the shell someone is signed in. An account with no name is not
      // what was asked for and cannot be renamed from anywhere in the app
      // yet, so the half-made session is dropped and the person stays on the
      // screen they were on, free to try the same name again.
      await signOut(auth()).catch(() => undefined);

      throw profileError;
    }

    // Firebase stays silent on a profile edit, so without this the app would
    // open on the main screen with no name until the next cold start.
    emitCurrentUser();
  } catch (error) {
    if (error instanceof AuthOperationError) throw error;

    throw new AuthOperationError(toFirebaseErrorKind(readErrorCode(error)));
  }
}

async function signOutEverywhere(): Promise<void> {
  // Clearing the cached Google account is what makes the next sign-in show
  // the chooser again instead of silently reusing the last account.
  try {
    configureGoogleOnce();
    await GoogleSignin.signOut();
  } catch {
    // Nobody signed in with Google on this device: nothing to clear, and
    // never a reason to fail the sign-out the person actually asked for.
  }

  await run(() => signOut(auth()));
}

/**
 * Erasing an account is one of the operations Firebase only accepts from a
 * session it considers fresh. Its own window is five minutes; asking for the
 * proof a minute early costs one sheet, being refused halfway through costs
 * the person their data with the account still standing.
 */
const RECENT_LOGIN_WINDOW_MS = 4 * 60 * 1000;

function accountProvider(): AccountProvider {
  const user = auth().currentUser;

  if (user == null) return 'unknown';
  // An account made from a name alone has no provider to ask anything of.
  if (user.isAnonymous) return 'anonymous';

  const providers = user.providerData.map(entry => entry.providerId);

  // Password first: when the account has one, proving it is a field on a
  // screen this app draws, instead of somebody else's sheet.
  if (providers.includes('password')) return 'password';
  if (providers.includes('google.com')) return 'google';
  if (providers.includes('apple.com')) return 'apple';

  return 'unknown';
}

function requiresRecentLogin(): boolean {
  const user = auth().currentUser;

  if (user == null) return false;
  // Nothing to sign in again with, and Firebase lets an anonymous account go
  // without asking: demanding proof here would be a door with no handle.
  if (user.isAnonymous) return false;

  const lastSignIn = Date.parse(user.metadata.lastSignInTime ?? '');

  // No timestamp at all is not permission to skip the question.
  if (Number.isNaN(lastSignIn)) return true;

  return Date.now() - lastSignIn > RECENT_LOGIN_WINDOW_MS;
}

async function reauthenticate(password?: string): Promise<void> {
  const user = auth().currentUser;

  if (user == null) throw new AuthOperationError('invalid-credential');

  const provider = accountProvider();

  if (provider === 'google') {
    // The chooser's own failures speak Google, not Firebase: mapped here the
    // same way signing in maps them, so "you closed the sheet" never reaches
    // a screen as "something did not work".
    let idToken: string;

    try {
      idToken = await googleIdToken();
    } catch (error) {
      if (error instanceof AuthOperationError) throw error;

      throw new AuthOperationError(toGoogleErrorKind(readErrorCode(error)));
    }

    await run(() =>
      reauthenticateWithCredential(
        user,
        GoogleAuthProvider.credential(idToken),
      ),
    );

    return;
  }

  if (provider === 'apple') {
    let authorization: Awaited<ReturnType<typeof appleAuthorization>>;

    try {
      authorization = await appleAuthorization();
    } catch (error) {
      if (error instanceof AuthOperationError) throw error;

      throw new AuthOperationError(toAppleErrorKind(readErrorCode(error)));
    }

    await run(() =>
      reauthenticateWithCredential(
        user,
        AppleAuthProvider.credential(
          authorization.identityToken,
          authorization.nonce,
        ),
      ),
    );

    return;
  }

  if (provider === 'password') {
    const email = user.email;

    if (email == null || password == null || password.length === 0) {
      throw new AuthOperationError('invalid-credential');
    }

    await run(() =>
      reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(email, password),
      ),
    );

    return;
  }

  throw new AuthOperationError('provider-unavailable');
}

async function deleteAccount(): Promise<void> {
  const user = auth().currentUser;

  // Already gone — a second tap after the first one landed, or a session that
  // ended in between. Nothing left to erase is the outcome that was asked for.
  if (user == null) return;

  await run(() => deleteUser(user));
}

export const firebaseAuthAdapter: AuthPort = {
  signIn: (email, password) =>
    run(() => signInWithEmailAndPassword(auth(), email, password)),
  signUp: (email, password) =>
    run(() => createUserWithEmailAndPassword(auth(), email, password)),
  sendPasswordReset: email => run(() => sendPasswordResetEmail(auth(), email)),
  signInWithGoogle,
  signInWithApple,
  signInAnonymously: signInWithName,
  signOut: signOutEverywhere,
  accountProvider,
  requiresRecentLogin,
  reauthenticate,
  deleteAccount,
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

  listeners.add(listener);

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
    listeners.delete(listener);
    if (retryTimeout != null) clearTimeout(retryTimeout);
    unsubscribeReal?.();
  };
}
