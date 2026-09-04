import { useState } from 'react';
import styled from 'styled-components/native';

import type { AuthCopy } from '../localization/authCopy';
import { validateEmail } from '../models/validateAuthForm';
import type { SubmitState } from '../view-models/useAuthViewModel';
import { AuthButton } from '../views/AuthButton';
import { AuthFormError } from '../views/AuthFormError';
import { AuthLink } from '../views/AuthLink';
import { AuthScreenLayout } from '../views/AuthScreenLayout';
import { AuthTextField } from '../views/AuthTextField';

interface ForgotPasswordScreenProps {
  copy: AuthCopy;
  state: SubmitState;
  sentTo: string | null;
  onSubmit: (email: string) => void;
  onBackToLogin: () => void;
}

export function ForgotPasswordScreen({
  copy,
  state,
  sentTo,
  onSubmit,
  onBackToLogin,
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);

  function handleSubmit() {
    const emailError = validateEmail(email, copy);

    if (emailError != null) {
      setFieldError(emailError);
      return;
    }

    setFieldError(undefined);
    onSubmit(email);
  }

  const isSubmitting = state.status === 'submitting';

  if (sentTo != null) {
    return (
      <AuthScreenLayout
        subtitle={copy.forgot.subtitle}
        title={copy.forgot.title}
      >
        <Confirmation accessibilityLiveRegion="polite">
          {copy.forgot.sent(sentTo)}
        </Confirmation>
        <AuthButton
          label={copy.forgot.backToLoginLink}
          onPress={onBackToLogin}
          testID="forgot-done"
        />
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout subtitle={copy.forgot.subtitle} title={copy.forgot.title}>
      <AuthTextField
        error={fieldError}
        kind="email"
        label={copy.fields.email}
        onChangeText={setEmail}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        testID="forgot-email"
        value={email}
      />

      {state.status === 'error' && state.errorKind != null ? (
        <AuthFormError
          message={copy.errors[state.errorKind]}
          onRetry={state.errorKind === 'network' ? handleSubmit : undefined}
          retryLabel={copy.retry}
        />
      ) : null}

      <AuthButton
        label={copy.forgot.submit}
        loading={isSubmitting}
        onPress={handleSubmit}
        testID="forgot-submit"
      />
      <AuthLink
        label={copy.forgot.backToLoginLink}
        onPress={onBackToLogin}
        testID="forgot-back"
      />
    </AuthScreenLayout>
  );
}

const Confirmation = styled.Text`
  color: ${({ theme }) => theme.colors.successInk};
  font-weight: 700;
  font-size: ${({ theme }) => theme.type.body}px;
  line-height: 21px;
  margin-top: ${({ theme }) => theme.spacing.large}px;
`;
