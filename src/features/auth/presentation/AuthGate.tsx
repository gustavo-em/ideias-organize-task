import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import type { AuthCopy } from './localization/authCopy';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import type { AuthViewModel } from './view-models/useAuthViewModel';

type AuthStage = 'login' | 'signUp' | 'forgot';

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

  return (
    <LoginScreen
      copy={copy}
      onForgotPassword={() => setStage('forgot')}
      onSignUp={() => setStage('signUp')}
      onSubmit={(email, password) => auth.signIn(email, password)}
      state={auth.login}
    />
  );
}
