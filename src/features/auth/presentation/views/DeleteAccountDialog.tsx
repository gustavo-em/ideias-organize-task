import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import Animated from 'react-native-reanimated';
import styled from 'styled-components/native';

import {
  dialogEnter,
  scrimEnter,
  scrimExit,
  sheetExit,
} from '../../../../app/animation/motion';
import {
  SheetActionsRow,
  SheetCancelButton,
  SheetPrimaryButton,
} from '../../../tasks/presentation/views/SheetActions';
import type { AuthCopy } from '../localization/authCopy';
import { AuthTextField } from './AuthTextField';

interface DeleteAccountDialogProps {
  copy: AuthCopy;
  /** True for an account with a password of its own: nothing else can be
   * proven by typing, and every other provider opens its own sheet instead. */
  asksForPassword: boolean;
  /** True once the account has to be proven again before anything is erased —
   * the sheet then leads with that, not with the list of losses. */
  needsProof: boolean;
  busy: boolean;
  /** Why the last attempt did not go through, already in the app's words. */
  error: string | null;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}

/**
 * The door out of the account, and the only one that destroys anything.
 *
 * It says what goes before it asks, because the list is the decision: a
 * person who reads "the spaces you own come down for everyone" and stops is
 * the point of this screen, not a failure of it. Cancel sits first and quiet;
 * the red button is on the right, where nothing is confirmed by muscle memory.
 *
 * An account with a password proves itself here, in a field. Google and Apple
 * accounts prove themselves in their own sheet, which the confirm button opens
 * — so this dialog never asks them for anything it cannot check.
 */
export function DeleteAccountDialog({
  copy,
  asksForPassword,
  needsProof,
  busy,
  error,
  onCancel,
  onConfirm,
}: DeleteAccountDialogProps) {
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Back means "never mind", never "yes".
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!busy) onCancel();

        return true;
      },
    );

    return () => subscription.remove();
  }, [busy, onCancel]);

  const blocked = busy || (asksForPassword && password.length === 0);

  return (
    <Overlay
      entering={scrimEnter()}
      exiting={scrimExit()}
      testID="delete-account-dialog"
    >
      <Scrim
        accessibilityLabel={copy.deleteAccount.cancel}
        accessibilityRole="button"
        onPress={() => {
          if (!busy) onCancel();
        }}
      />
      <Card entering={dialogEnter()} exiting={sheetExit()}>
        <Title accessibilityRole="header">
          {needsProof
            ? copy.deleteAccount.proofTitle
            : copy.deleteAccount.title}
        </Title>
        <Body>
          {needsProof ? copy.deleteAccount.proofBody : copy.deleteAccount.body}
        </Body>

        {needsProof ? null : (
          <Losses>
            {copy.deleteAccount.losses.map(line => (
              <Loss key={line}>
                <Bullet>•</Bullet>
                <LossText>{line}</LossText>
              </Loss>
            ))}
          </Losses>
        )}

        {asksForPassword ? (
          <Field>
            <AuthTextField
              autoFocus={needsProof}
              editable={!busy}
              kind="password"
              label={copy.deleteAccount.passwordLabel}
              onChangeText={setPassword}
              returnKeyType="done"
              testID="delete-account-password"
              value={password}
            />
            <FieldHint>{copy.deleteAccount.passwordHint}</FieldHint>
          </Field>
        ) : null}

        {error == null ? null : (
          <ErrorLine
            accessibilityLiveRegion="polite"
            testID="delete-account-error"
          >
            {error}
          </ErrorLine>
        )}

        <SheetActionsRow>
          <SheetCancelButton
            label={copy.deleteAccount.cancel}
            onPress={onCancel}
            testID="delete-account-cancel"
          />
          <SheetPrimaryButton
            destructive
            disabled={blocked}
            label={copy.deleteAccount.confirm}
            loading={busy}
            onPress={() => onConfirm(password)}
            testID="delete-account-confirm"
          />
        </SheetActionsRow>
      </Card>
    </Overlay>
  );
}

const Overlay = styled(Animated.View)`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  align-items: center;
  justify-content: center;
  padding: 0px ${({ theme }) => theme.spacing.large}px;
  background-color: ${({ theme }) => theme.colors.scrim};
  z-index: 30;
`;

const Scrim = styled.Pressable`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
`;

const Card = styled(Animated.View)`
  width: 100%;
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.extraLarge}px;
  padding: ${({ theme }) => theme.spacing.large}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.heading - 1}px;
  font-weight: 700;
  letter-spacing: -0.3px;
  line-height: ${({ theme }) => theme.type.heading + 6}px;
`;

const Body = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const Losses = styled.View`
  margin-top: ${({ theme }) => theme.spacing.small}px;
  gap: 4px;
`;

const Loss = styled.View`
  flex-direction: row;
  gap: 8px;
`;

const Bullet = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
`;

const LossText = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
`;

const Field = styled.View`
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const FieldHint = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: 18px;
  margin-top: 6px;
`;

const ErrorLine = styled.Text`
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 600;
  line-height: 18px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;
