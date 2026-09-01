import { useRef, useState } from 'react';

import type { AuthCopy } from '../localization/authCopy';
import type { SubmitState } from '../view-models/useAuthViewModel';
import { AuthButton } from '../views/AuthButton';
import { AuthFormError } from '../views/AuthFormError';
import { AuthLink } from '../views/AuthLink';
import { AuthScreenLayout } from '../views/AuthScreenLayout';
import {
  AuthTextField,
  type AuthTextFieldHandle,
} from '../views/AuthTextField';

interface LoginScreenProps {
  copy: AuthCopy;
  state: SubmitState;
  onSubmit: (email: string, password: string) => void;
  onForgotPassword: () => void;
  onSignUp: () => void;
}

export function LoginScreen({
  copy,
  state,
  onSubmit,
  onForgotPassword,
  onSignUp,
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

  return (
    <AuthScreenLayout subtitle={copy.login.subtitle} title={copy.login.title}>
      <AuthTextField
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
        label={copy.login.submit}
        loading={isSubmitting}
        onPress={handleSubmit}
        testID="login-submit"
      />
      <AuthLink
        label={copy.login.forgotLink}
        onPress={onForgotPassword}
        testID="login-forgot"
      />
      <AuthLink
        label={copy.login.signUpLink}
        onPress={onSignUp}
        testID="login-signup"
      />
    </AuthScreenLayout>
  );
}
