import { useCallback, useEffect, useState } from 'react';

import type { AuthPort } from '../../application/ports/AuthPort';
import { AuthOperationError, type AuthErrorKind } from '../../domain/AuthError';
import type { AuthUser } from '../../domain/AuthUser';

export type AuthSessionStatus = 'checking' | 'signedOut' | 'signedIn';

export interface SubmitState {
  status: 'idle' | 'submitting' | 'error';
  errorKind: AuthErrorKind | null;
}

const IDLE: SubmitState = { status: 'idle', errorKind: null };
const SUBMITTING: SubmitState = { status: 'submitting', errorKind: null };

function errorKindOf(error: unknown): AuthErrorKind {
  return error instanceof AuthOperationError ? error.kind : 'unknown';
}

/**
 * The shell's auth state: who is signed in, and how each of the three forms
 * is doing right now. One `submitting`/`error` pair per form, so typing in
 * the sign-up screen can never be mistaken for the login screen's spinner.
 */
export function useAuthViewModel(authPort: AuthPort) {
  const [status, setStatus] = useState<AuthSessionStatus>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [login, setLogin] = useState<SubmitState>(IDLE);
  const [signUp, setSignUp] = useState<SubmitState>(IDLE);
  const [forgot, setForgot] = useState<SubmitState>(IDLE);
  const [forgotSentTo, setForgotSentTo] = useState<string | null>(null);
  const [signOutState, setSignOutState] = useState<SubmitState>(IDLE);
  const [google, setGoogle] = useState<SubmitState>(IDLE);
  const [apple, setApple] = useState<SubmitState>(IDLE);
  const [anonymous, setAnonymous] = useState<SubmitState>(IDLE);

  useEffect(() => {
    try {
      return authPort.onAuthStateChanged(nextUser => {
        setUser(nextUser);
        setStatus(nextUser == null ? 'signedOut' : 'signedIn');
      });
    } catch {
      // Whatever the adapter is built on, a failure to start watching the
      // session must never crash the shell before a screen draws — the safe
      // default is the login screen, same as an adapter-level failure.
      setUser(null);
      setStatus('signedOut');
      return undefined;
    }
  }, [authPort]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLogin(SUBMITTING);
      try {
        await authPort.signIn(email, password);
        setLogin(IDLE);
      } catch (error) {
        setLogin({ status: 'error', errorKind: errorKindOf(error) });
      }
    },
    [authPort],
  );

  const submitSignUp = useCallback(
    async (email: string, password: string) => {
      setSignUp(SUBMITTING);
      try {
        await authPort.signUp(email, password);
        setSignUp(IDLE);
      } catch (error) {
        setSignUp({ status: 'error', errorKind: errorKindOf(error) });
      }
    },
    [authPort],
  );

  const sendPasswordReset = useCallback(
    async (email: string) => {
      setForgot(SUBMITTING);
      try {
        await authPort.sendPasswordReset(email);
        setForgot(IDLE);
        setForgotSentTo(email);
      } catch (error) {
        setForgot({ status: 'error', errorKind: errorKindOf(error) });
      }
    },
    [authPort],
  );

  /** Backing out of a provider's own sheet is not a failure and never shows
   * a message: the form simply goes back to how it was before the tap. */
  const settle = useCallback(
    (apply: (next: SubmitState) => void, error: unknown) => {
      const kind = errorKindOf(error);

      apply(kind === 'cancelled' ? IDLE : { status: 'error', errorKind: kind });
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    setGoogle(SUBMITTING);
    try {
      await authPort.signInWithGoogle();
      setGoogle(IDLE);
    } catch (error) {
      settle(setGoogle, error);
    }
  }, [authPort, settle]);

  const signInWithApple = useCallback(async () => {
    setApple(SUBMITTING);
    try {
      await authPort.signInWithApple();
      setApple(IDLE);
    } catch (error) {
      settle(setApple, error);
    }
  }, [authPort, settle]);

  const signInAnonymously = useCallback(
    async (displayName: string) => {
      setAnonymous(SUBMITTING);
      try {
        await authPort.signInAnonymously(displayName);
        setAnonymous(IDLE);
      } catch (error) {
        settle(setAnonymous, error);
      }
    },
    [authPort, settle],
  );

  /** Called when the gate swaps screens: an error from the last attempt
   * belongs to the screen that produced it, and must not greet whoever comes
   * back to it later without having touched anything. */
  const resetProviderErrors = useCallback(() => {
    setGoogle(IDLE);
    setApple(IDLE);
    setAnonymous(IDLE);
  }, []);

  // Cleared on leaving the forgot-password screen, so coming back to it
  // later starts from the form again instead of the confirmation.
  const resetForgotConfirmation = useCallback(() => setForgotSentTo(null), []);

  const signOut = useCallback(async () => {
    setSignOutState(SUBMITTING);
    try {
      await authPort.signOut();
      setSignOutState(IDLE);
    } catch (error) {
      setSignOutState({ status: 'error', errorKind: errorKindOf(error) });
    }
  }, [authPort]);

  return {
    status,
    user,
    login,
    signUp,
    forgot,
    forgotSentTo,
    signOutState,
    google,
    apple,
    anonymous,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signInAnonymously,
    resetProviderErrors,
    submitSignUp,
    sendPasswordReset,
    resetForgotConfirmation,
    signOut,
  };
}

export type AuthViewModel = ReturnType<typeof useAuthViewModel>;
