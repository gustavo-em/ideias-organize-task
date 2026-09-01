import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { MemberChip } from '../../../tasks/presentation/views/MemberChip';
import { PressableScale } from '../../../tasks/presentation/views/PressableScale';
import type { ProfileErrorKind } from '../../domain/ProfileError';
import {
  DISPLAY_NAME_MAX_LENGTH,
  HANDLE_MAX_LENGTH,
  normalizeHandle,
  validateHandle,
  type HandleIssue,
  type UserProfile,
} from '../../domain/UserProfile';
import type { AuthCopy } from '../localization/authCopy';

interface ProfileSheetProps {
  copy: AuthCopy;
  profile: UserProfile | null;
  /** The uid, so the chip's tone is the same one the person has everywhere. */
  personId: string;
  /** What to call an account that has no name yet — the same label the
   * account row in Ajustes uses, so one screen never contradicts the other. */
  fallbackName: string;
  saving: boolean;
  /** Set when the last attempt came back from the server refused. */
  errorKind: ProfileErrorKind | null;
  onCancel: () => void;
  /** Resolves true when the profile was saved. */
  onSubmit: (displayName: string, handle: string) => Promise<boolean>;
}

type LocalIssue = 'display-name-required' | HandleIssue;

function messageFor(copy: AuthCopy, issue: LocalIssue): string {
  switch (issue) {
    case 'display-name-required':
      return copy.profile.errors.displayNameRequired;
    case 'too-short':
      return copy.profile.errors.handleTooShort;
    case 'too-long':
      return copy.profile.errors.handleTooLong;
    default:
      return copy.profile.errors.handleInvalidChars;
  }
}

function serverMessageFor(copy: AuthCopy, kind: ProfileErrorKind): string {
  if (kind === 'handle-taken') return copy.profile.errors.handleTaken;
  if (kind === 'refused') return copy.profile.errors.refused;
  if (kind === 'forbidden') return copy.profile.errors.forbidden;

  return copy.profile.errors.network;
}

/** Where a person names themselves: a display name and the handle everyone
 * else sees. Nothing here ever shows or asks for an e-mail. */
export function ProfileSheet({
  copy,
  profile,
  personId,
  fallbackName,
  saving,
  errorKind,
  onCancel,
  onSubmit,
}: ProfileSheetProps) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const handleRef = useRef<ComponentRef<typeof HandleInput>>(null);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [handle, setHandle] = useState(profile?.handle ?? '');
  const [issue, setIssue] = useState<LocalIssue | null>(null);

  const trimmedName = displayName.trim();
  // Exactly what the account row in Ajustes shows, so the chip and the name
  // never disagree between the row and the sheet standing over it.
  const previewName =
    trimmedName.length > 0 ? trimmedName : profile?.displayName ?? fallbackName;
  const changed =
    trimmedName !== (profile?.displayName ?? '') ||
    handle !== (profile?.handle ?? '');
  const submittable = trimmedName.length > 0 && handle.length > 0 && changed;

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onCancel();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onCancel]);

  // The profile can land a moment after the sheet opens; the fields take it
  // only while nothing has been typed, so it never overwrites an edit.
  useEffect(() => {
    if (profile == null) return;

    setDisplayName(current =>
      current.length === 0 ? profile.displayName : current,
    );
    setHandle(current => (current.length === 0 ? profile.handle : current));
  }, [profile]);

  // A refusal from the server always belongs to the handle field, and the
  // typed text stays exactly as it is.
  useEffect(() => {
    if (errorKind === 'handle-taken') handleRef.current?.focus();
  }, [errorKind]);

  const errorMessage =
    issue != null
      ? messageFor(copy, issue)
      : errorKind != null
      ? serverMessageFor(copy, errorKind)
      : null;

  async function submit() {
    if (saving) return;

    if (trimmedName.length === 0) {
      setIssue('display-name-required');
      return;
    }

    const handleIssue = validateHandle(handle);
    if (handleIssue != null) {
      setIssue(handleIssue);
      handleRef.current?.focus();
      return;
    }

    setIssue(null);
    const saved = await onSubmit(trimmedName, normalizeHandle(handle));
    if (saved) onCancel();
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible
    >
      <Overlay>
        <Scrim entering={FadeIn.duration(160)} exiting={FadeOut.duration(200)}>
          <ScrimTouch
            accessibilityLabel={copy.profile.cancel}
            accessibilityRole="button"
            onPress={onCancel}
          />
        </Scrim>
        <Lift behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Sheet
            entering={SlideInDown.springify().damping(20).stiffness(200)}
            exiting={SlideOutDown.duration(180)}
          >
            <Grabber />
            <Fields
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: height * 0.62 }}
            >
              <Title accessibilityRole="header">{copy.profile.title}</Title>
              <Hint>{copy.profile.subtitle}</Hint>

              <Preview>
                <MemberChip
                  name={previewName}
                  personId={personId}
                  size="large"
                />
                <PreviewText>
                  <PreviewName numberOfLines={1} ellipsizeMode="tail">
                    {previewName}
                  </PreviewName>
                  <PreviewHandle numberOfLines={1} ellipsizeMode="tail">
                    {`@${
                      handle.length > 0
                        ? handle
                        : copy.profile.handlePlaceholder
                    }`}
                  </PreviewHandle>
                </PreviewText>
              </Preview>

              <FieldLabel>{copy.profile.displayNameLabel}</FieldLabel>
              <Field
                accessibilityLabel={copy.profile.displayNameLabel}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                onChangeText={value => {
                  setDisplayName(value);
                  setIssue(null);
                }}
                placeholder={copy.profile.displayNamePlaceholder}
                returnKeyType="next"
                testID="profile-display-name"
                value={displayName}
              />

              <FieldLabel>{copy.profile.handleLabel}</FieldLabel>
              <HandleField
                $invalid={
                  errorMessage != null && issue !== 'display-name-required'
                }
              >
                <HandlePrefix>@</HandlePrefix>
                <HandleInput
                  accessibilityLabel={copy.profile.handleLabel}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={HANDLE_MAX_LENGTH}
                  onBlur={() => {
                    if (handle.length === 0) return;
                    setIssue(validateHandle(handle));
                  }}
                  onChangeText={value => {
                    setHandle(normalizeHandle(value));
                    setIssue(null);
                  }}
                  onSubmitEditing={submit}
                  placeholder={copy.profile.handlePlaceholder}
                  ref={handleRef}
                  returnKeyType="done"
                  testID="profile-handle"
                  value={handle}
                />
              </HandleField>
              <FieldHint>{copy.profile.handleHint}</FieldHint>

              {errorMessage == null ? null : (
                <ErrorText
                  accessibilityLiveRegion="polite"
                  testID="profile-error"
                >
                  {errorMessage}
                </ErrorText>
              )}
            </Fields>

            <Footer>
              <Cancel
                accessibilityLabel={copy.profile.cancel}
                accessibilityRole="button"
                onPress={onCancel}
              >
                <CancelText>{copy.profile.cancel}</CancelText>
              </Cancel>
              <Submit
                accessibilityLabel={copy.profile.submit}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: !submittable || saving,
                  busy: saving,
                }}
                disabled={!submittable || saving}
                onPress={submit}
                testID="profile-submit"
              >
                {saving ? (
                  <ActivityIndicator
                    color={theme.colors.onAccent}
                    size="small"
                  />
                ) : (
                  <SubmitText>{copy.profile.submit}</SubmitText>
                )}
              </Submit>
            </Footer>
          </Sheet>
        </Lift>
      </Overlay>
    </Modal>
  );
}

const Overlay = styled.View`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  justify-content: flex-end;
  z-index: 40;
`;

const Scrim = styled(Animated.View)`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  background-color: ${({ theme }) => theme.colors.scrim};
`;

const ScrimTouch = styled.Pressable`
  flex: 1;
`;

const Lift = styled(KeyboardAvoidingView)`
  justify-content: flex-end;
`;

const Sheet = styled(Animated.View)`
  background-color: ${({ theme }) => theme.colors.background};
  border-top-left-radius: ${({ theme }) => theme.radii.extraLarge}px;
  border-top-right-radius: ${({ theme }) => theme.radii.extraLarge}px;
  padding: ${({ theme }) => theme.spacing.medium}px
    ${({ theme }) => theme.spacing.large}px
    ${({ theme }) => theme.spacing.large}px;
`;

const Grabber = styled.View`
  width: 36px;
  height: 4px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.border};
  align-self: center;
  margin-bottom: ${({ theme }) => theme.spacing.medium}px;
`;

const Fields = styled.ScrollView``;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.heading}px;
  font-weight: 800;
  letter-spacing: -0.4px;
`;

const Hint = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const Preview = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
  padding-bottom: ${({ theme }) => theme.spacing.medium}px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const PreviewText = styled.View`
  flex: 1;
`;

const PreviewName = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 700;
`;

const PreviewHandle = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  margin-top: 2px;
`;

const FieldLabel = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Field = styled.TextInput.attrs(({ theme }) => ({
  placeholderTextColor: theme.colors.muted,
}))`
  border: 2px solid ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.card};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  padding: 13px 14px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
  min-height: 48px;
`;

const HandleField = styled.View<{ $invalid: boolean }>`
  flex-direction: row;
  align-items: center;
  border: 2px solid
    ${({ theme, $invalid }) =>
      $invalid ? theme.colors.projectCoral : theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.card};
  padding-left: 14px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
  min-height: 48px;
`;

const HandlePrefix = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 700;
`;

const HandleInput = styled.TextInput.attrs(({ theme }) => ({
  placeholderTextColor: theme.colors.muted,
}))`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  padding: 13px 14px 13px 2px;
`;

const FieldHint = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  margin-top: ${({ theme }) => theme.spacing.tiny}px;
`;

const ErrorText = styled.Text`
  color: ${({ theme }) => theme.colors.projectCoral};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 700;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const Footer = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.large}px;
`;

const Cancel = styled(PressableScale)`
  min-height: 48px;
  justify-content: center;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
`;

const CancelText = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;

const Submit = styled(PressableScale)`
  min-height: 48px;
  min-width: 120px;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme, disabled }) =>
    disabled ? theme.colors.cardElevated : theme.colors.accent};
`;

const SubmitText = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;
