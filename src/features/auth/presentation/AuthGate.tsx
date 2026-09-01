import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { AnonymousNameScreen } from './screens/AnonymousNameScreen';
import type { AuthCopy } from './localization/authCopy';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import type { AuthViewModel } from './view-models/useAuthViewModel';

type AuthStage = 'login' | 'signUp' | 'forgot' | 'anonymous';

interface AuthGateProps {
  auth: AuthViewModel;
  copy: AuthCopy;
  /** Called once, right after mount: signed-out screens have nothing else to
   * wait on, so the shell's splash can finish as soon as this is on screen. */
  onReady: () => void;
}

/**
 * The three screens shown while nobody is signed in. A local stage instead
 * of a navigation library, matching how the shell already swaps its four
 * tabs by state.
 */
export function AuthGate({ auth, copy, onReady }: AuthGateProps) {
  const [stage, setStage] = useState<AuthStage>('login');

  useEffect(() => {
    onReady();
    // Runs once: this screen has no async loading of its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage === 'login') return undefined;

    // Android back closes the sub-screen instead of the app while inside
    // sign-up or recovery; from login itself, back keeps its default exit.
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setStage('login');
        return true;
      },
    );

    return () => subscription.remove();
  }, [stage]);

  useEffect(() => {
    if (stage !== 'forgot') auth.resetForgotConfirmation();
  }, [auth, stage]);

  // Every screen change starts the provider buttons clean: an error left
  // over from a previous attempt is not news on a screen just opened.
  const { resetProviderErrors } = auth;

  useEffect(() => {
    resetProviderErrors();
  }, [resetProviderErrors, stage]);

  if (stage === 'signUp') {
    return (
      <SignUpScreen
        copy={copy}
        onBackToLogin={() => setStage('login')}
        onSubmit={(email, password) => auth.submitSignUp(email, password)}
        state={auth.signUp}
      />
    );
  }

  if (stage === 'forgot') {
    return (
      <ForgotPasswordScreen
        copy={copy}
        onBackToLogin={() => setStage('login')}
        onSubmit={email => auth.sendPasswordReset(email)}
        sentTo={auth.forgotSentTo}
        state={auth.forgot}
      />
    );
  }

  if (stage === 'anonymous') {
    return (
      <AnonymousNameScreen
        copy={copy}
        onBackToLogin={() => setStage('login')}
        onSubmit={displayName => auth.signInAnonymously(displayName)}
        state={auth.anonymous}
      />
    );
  }

  return (
    <LoginScreen
      appleState={auth.apple}
      copy={copy}
      googleState={auth.google}
      onApple={auth.signInWithApple}
      onContinueWithName={() => setStage('anonymous')}
      onForgotPassword={() => setStage('forgot')}
      onGoogle={auth.signInWithGoogle}
      onSignUp={() => setStage('signUp')}
      onSubmit={(email, password) => auth.signIn(email, password)}
      state={auth.login}
    />
  );
}
