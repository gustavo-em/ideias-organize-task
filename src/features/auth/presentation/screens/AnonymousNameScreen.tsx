import { useState } from 'react';
import styled from 'styled-components/native';

import type { AuthCopy } from '../localization/authCopy';
import {
  MAX_DISPLAY_NAME_LENGTH,
  validateDisplayName,
} from '../models/validateAuthForm';
import type { SubmitState } from '../view-models/useAuthViewModel';
import { AuthButton } from '../views/AuthButton';
import { AuthFormError } from '../views/AuthFormError';
import { AuthLink } from '../views/AuthLink';
import { AuthScreenLayout } from '../views/AuthScreenLayout';
import { AuthTextField } from '../views/AuthTextField';

interface AnonymousNameScreenProps {
  copy: AuthCopy;
  state: SubmitState;
  onSubmit: (displayName: string) => void;
  onBackToLogin: () => void;
}

/**
 * The whole account, in one field. What this screen owes the person is the
 * part they cannot see: an account with no email lives on this device only,
 * so that is said before the button, not after the first lost phone.
 */
export function AnonymousNameScreen({
  copy,
  state,
  onSubmit,
  onBackToLogin,
}: AnonymousNameScreenProps) {
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);

  function handleSubmit() {
    const error = validateDisplayName(name, copy);

    if (error != null) {
      setFieldError(error);
      return;
    }

    setFieldError(undefined);
    onSubmit(name.trim());
  }

  return (
    <AuthScreenLayout
      subtitle={copy.anonymous.subtitle}
      title={copy.anonymous.title}
    >
      <AuthTextField
        autoFocus
        error={fieldError}
        kind="name"
        label={copy.fields.name}
        maxLength={MAX_DISPLAY_NAME_LENGTH}
        onChangeText={setName}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        testID="anonymous-name"
        value={name}
      />

      <Notice>
        <NoticeRule />
        <NoticeText>{copy.anonymous.notice}</NoticeText>
      </Notice>

      {state.status === 'error' && state.errorKind != null ? (
        <AuthFormError
          message={copy.errors[state.errorKind]}
          onRetry={state.errorKind === 'network' ? handleSubmit : undefined}
          retryLabel={copy.retry}
        />
      ) : null}

      <AuthButton
        label={copy.anonymous.submit}
        loading={state.status === 'submitting'}
        onPress={handleSubmit}
        testID="anonymous-submit"
      />
      <AuthLink
        label={copy.anonymous.backToLoginLink}
        onPress={onBackToLogin}
        testID="anonymous-back"
      />
    </AuthScreenLayout>
  );
}

const Notice = styled.View`
  margin-top: ${({ theme }) => theme.spacing.large}px;
`;

const NoticeRule = styled.View`
  height: 1px;
  opacity: 0.4;
  background-color: ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing.small}px;
`;

const NoticeText = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: 18px;
`;
