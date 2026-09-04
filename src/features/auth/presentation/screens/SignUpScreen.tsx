import { useRef, useState } from 'react';

import type { AuthCopy } from '../localization/authCopy';
import {
  validateConfirmPassword,
  validateEmail,
  validateNewPassword,
} from '../models/validateAuthForm';
import type { SubmitState } from '../view-models/useAuthViewModel';
import { AuthButton } from '../views/AuthButton';
import { AuthFormError } from '../views/AuthFormError';
import { AuthLink } from '../views/AuthLink';
import { AuthScreenLayout } from '../views/AuthScreenLayout';
import {
  AuthTextField,
  type AuthTextFieldHandle,
} from '../views/AuthTextField';

interface SignUpScreenProps {
  copy: AuthCopy;
  state: SubmitState;
  onSubmit: (email: string, password: string) => void;
  onBackToLogin: () => void;
}

export function SignUpScreen({
  copy,
  state,
  onSubmit,
  onBackToLogin,
}: SignUpScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const passwordRef = useRef<AuthTextFieldHandle>(null);
  const confirmRef = useRef<AuthTextFieldHandle>(null);

  function handleSubmit() {
    const emailError = validateEmail(email, copy);
    const passwordError = validateNewPassword(password, copy);
    const confirmError =
      passwordError == null
        ? validateConfirmPassword(password, confirmPassword, copy)
        : null;

    if (emailError != null || passwordError != null || confirmError != null) {
      setFieldError({
        email: emailError ?? undefined,
        password: passwordError ?? undefined,
        confirmPassword: confirmError ?? undefined,
      });
      return;
    }

    setFieldError({});
    onSubmit(email, password);
  }

  const isSubmitting = state.status === 'submitting';

  return (
    <AuthScreenLayout subtitle={copy.signUp.subtitle} title={copy.signUp.title}>
      <AuthTextField
        error={fieldError.email}
        kind="email"
        label={copy.fields.email}
        onChangeText={setEmail}
        onSubmitEditing={() => passwordRef.current?.focus()}
        returnKeyType="next"
        testID="signup-email"
        value={email}
      />
      <AuthTextField
        error={fieldError.password}
        kind="newPassword"
        label={copy.fields.password}
        onChangeText={setPassword}
        onSubmitEditing={() => confirmRef.current?.focus()}
        ref={passwordRef}
        returnKeyType="next"
        testID="signup-password"
        value={password}
      />
      <AuthTextField
        error={fieldError.confirmPassword}
        kind="confirmPassword"
        label={copy.fields.confirmPassword}
        onChangeText={setConfirmPassword}
        onSubmitEditing={handleSubmit}
        ref={confirmRef}
        returnKeyType="done"
        testID="signup-confirm"
        value={confirmPassword}
      />

      {state.status === 'error' && state.errorKind != null ? (
        <AuthFormError
          message={copy.errors[state.errorKind]}
          onRetry={state.errorKind === 'network' ? handleSubmit : undefined}
          retryLabel={copy.retry}
        />
      ) : null}

      <AuthButton
        label={copy.signUp.submit}
        loading={isSubmitting}
        onPress={handleSubmit}
        testID="signup-submit"
      />
      <AuthLink
        label={copy.signUp.backToLoginLink}
        onPress={onBackToLogin}
        testID="signup-back"
      />
    </AuthScreenLayout>
  );
}
