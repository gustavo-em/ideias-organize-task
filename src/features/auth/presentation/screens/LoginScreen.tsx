import { useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { AuthCopy } from '../localization/authCopy';
import type { SubmitState } from '../view-models/useAuthViewModel';
import { AuthButton } from '../views/AuthButton';
import { AuthDivider } from '../views/AuthDivider';
import { AuthFormError } from '../views/AuthFormError';
import { AuthLink } from '../views/AuthLink';
import { AuthScreenLayout } from '../views/AuthScreenLayout';
import {
  AuthTextField,
  type AuthTextFieldHandle,
} from '../views/AuthTextField';
import { SecondaryAuthButton } from '../views/SecondaryAuthButton';
import { SocialAuthButton } from '../views/SocialAuthButton';

interface LoginScreenProps {
  copy: AuthCopy;
  state: SubmitState;
  googleState: SubmitState;
  appleState: SubmitState;
  onSubmit: (email: string, password: string) => void;
  onForgotPassword: () => void;
  onSignUp: () => void;
  onGoogle: () => void;
  onApple: () => void;
  onContinueWithName: () => void;
}

export function LoginScreen({
  copy,
  state,
  googleState,
  appleState,
  onSubmit,
  onForgotPassword,
  onSignUp,
  onGoogle,
  onApple,
  onContinueWithName,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<{
    email?: string;
    password?: string;
  }>({});
  const passwordRef = useRef<AuthTextFieldHandle>(null);

  function handleSubmit() {
    const emailError =
      email.trim().length === 0 ? copy.fieldErrors.emailRequired : null;
    const passwordError =
      password.length === 0 ? copy.fieldErrors.passwordRequired : null;

    if (emailError != null || passwordError != null) {
      setFieldError({
        email: emailError ?? undefined,
        password: passwordError ?? undefined,
      });
      return;
    }

    setFieldError({});
    onSubmit(email, password);
  }

  const isSubmitting = state.status === 'submitting';
  const isGoogleSubmitting = googleState.status === 'submitting';
  const isAppleSubmitting = appleState.status === 'submitting';
  // While one provider is talking to its own sheet, the other ways in are
  // held back — two sign-ins racing each other has no meaning here.
  const isBusy = isSubmitting || isGoogleSubmitting || isAppleSubmitting;

  return (
    <AuthScreenLayout subtitle={copy.login.subtitle} title={copy.login.title}>
      <AuthTextField
        editable={!isBusy}
        error={fieldError.email}
        kind="email"
        label={copy.fields.email}
        onChangeText={setEmail}
        onSubmitEditing={() => passwordRef.current?.focus()}
        returnKeyType="next"
        testID="login-email"
        value={email}
      />
      <AuthTextField
        editable={!isBusy}
        error={fieldError.password}
        kind="password"
        label={copy.fields.password}
        onChangeText={setPassword}
        onSubmitEditing={handleSubmit}
        ref={passwordRef}
        returnKeyType="done"
        testID="login-password"
        value={password}
      />

      {state.status === 'error' && state.errorKind != null ? (
        <AuthFormError
          message={copy.errors[state.errorKind]}
          onRetry={state.errorKind === 'network' ? handleSubmit : undefined}
          retryLabel={copy.retry}
        />
      ) : null}

      <AuthButton
        disabled={isBusy}
        label={copy.login.submit}
        loading={isSubmitting}
        onPress={handleSubmit}
        testID="login-submit"
      />
      <AuthLink
        disabled={isBusy}
        label={copy.login.forgotLink}
        onPress={onForgotPassword}
        testID="login-forgot"
      />
      <AuthLink
        disabled={isBusy}
        label={copy.login.signUpLink}
        onPress={onSignUp}
        testID="login-signup"
      />

      <AuthDivider label={copy.login.divider} />

      {googleState.status === 'error' && googleState.errorKind != null ? (
        <AuthFormError
          message={copy.errors[googleState.errorKind]}
          onRetry={googleState.errorKind === 'network' ? onGoogle : undefined}
          retryLabel={copy.retry}
        />
      ) : null}
      {appleState.status === 'error' && appleState.errorKind != null ? (
        <AuthFormError
          message={copy.errors[appleState.errorKind]}
          onRetry={appleState.errorKind === 'network' ? onApple : undefined}
          retryLabel={copy.retry}
        />
      ) : null}

      <SocialAuthButton
        disabled={isBusy}
        label={copy.login.google}
        loading={isGoogleSubmitting}
        onPress={onGoogle}
        provider="google"
        testID="login-google"
      />
      {/* Rendered only where it exists: on Android the button is absent from
          the layout and from the focus order, not merely hidden. */}
      {Platform.OS === 'ios' ? (
        <SocialAuthButton
          disabled={isBusy}
          label={copy.login.apple}
          loading={isAppleSubmitting}
          onPress={onApple}
          provider="apple"
          testID="login-apple"
        />
      ) : null}
      <SecondaryAuthButton
        disabled={isBusy}
        label={copy.login.anonymous}
        onPress={onContinueWithName}
        testID="login-anonymous"
      />
    </AuthScreenLayout>
  );
}
