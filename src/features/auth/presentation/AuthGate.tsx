import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { AnonymousNameScreen } from './screens/AnonymousNameScreen';
import type { AuthCopy } from './localization/authCopy';
import type { CutoutDemo } from '../../../app/components/onboarding/cutouts';
import { EntranceScreen } from './screens/EntranceScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import type { AuthViewModel } from './view-models/useAuthViewModel';

type AuthStage = 'entrance' | 'login' | 'signUp' | 'forgot' | 'anonymous';

interface AuthGateProps {
  auth: AuthViewModel;
  copy: AuthCopy;
  /** The words inside the entrance's cut-out, from the app's dictionary: the
   * fake screen there shows the same space the walk-through does. */
  demo: CutoutDemo;
  /** Called once, right after mount: signed-out screens have nothing else to
   * wait on, so the shell's splash can finish as soon as this is on screen. */
  onReady: () => void;
}

/**
 * The screens shown while nobody is signed in. A local stage instead of a
 * navigation library, matching how the shell already swaps its four tabs by
 * state.
 *
 * The entrance is the ground floor: it sells before it asks, and every other
 * screen here is something it opens. Back — the gesture on Android, the link
 * on iOS — always returns to it.
 */
export function AuthGate({ auth, copy, demo, onReady }: AuthGateProps) {
  const [stage, setStage] = useState<AuthStage>('entrance');

  useEffect(() => {
    onReady();
    // Runs once: this screen has no async loading of its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage === 'entrance') return undefined;

    // Android back closes the sub-screen instead of the app while inside the
    // email form, sign-up or recovery; from the entrance itself, back keeps
    // its default exit.
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setStage('entrance');
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

  if (stage === 'entrance') {
    return (
      <EntranceScreen
        appleState={auth.apple}
        copy={copy}
        demo={demo}
        googleState={auth.google}
        onApple={auth.signInWithApple}
        onEmail={() => setStage('login')}
        onGoogle={auth.signInWithGoogle}
        onGuest={() => setStage('anonymous')}
      />
    );
  }

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
        // Reached from the entrance, not from the email form: back goes where
        // it came from.
        onBackToLogin={() => setStage('entrance')}
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
      onBack={() => setStage('entrance')}
      onContinueWithName={() => setStage('anonymous')}
      onForgotPassword={() => setStage('forgot')}
      onGoogle={auth.signInWithGoogle}
      onSignUp={() => setStage('signUp')}
      onSubmit={(email, password) => auth.signIn(email, password)}
      showsProviders={false}
      state={auth.login}
    />
  );
}
