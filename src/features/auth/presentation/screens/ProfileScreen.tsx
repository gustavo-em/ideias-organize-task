import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';

import { pushEnter, pushExit } from '../../../../app/animation/motion';
import { ChevronGlyph } from '../../../tasks/presentation/views/FieldGlyphs';
import { MemberChip } from '../../../tasks/presentation/views/MemberChip';
import { PressableScale } from '../../../tasks/presentation/views/PressableScale';
import { ScreenHeader } from '../../../tasks/presentation/views/ScreenHeader';
import { SheetPrimaryButton } from '../../../tasks/presentation/views/SheetActions';
import type { AvatarErrorKind } from '../../domain/AvatarError';
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

interface ProfileScreenProps {
  copy: AuthCopy;
  profile: UserProfile | null;
  /** The uid, so the chip's tone is the same one the person has everywhere. */
  personId: string;
  /** What to call an account that has no name yet — the same label the
   * account block in the tab uses, so one screen never contradicts the
   * other. It is also the word on the way back. */
  fallbackName: string;
  saving: boolean;
  /** Set when the last attempt came back from the server refused. */
  errorKind: ProfileErrorKind | null;
  /** True while the chosen photo is on its way to the bucket. */
  avatarBusy: boolean;
  /** Why the last photo attempt did not land, in the app's own terms. */
  avatarErrorKind: AvatarErrorKind | null;
  /** Opens the gallery. The photo is saved on its own, without Salvar. */
  onChangeAvatar: () => void;
  /** Drops the uploaded photo, falling back to the provider's or the
   * initials. */
  onRemoveAvatar: () => void;
  /** Leaves the screen, keeping whatever was already saved. */
  onBack: () => void;
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

function photoMessageFor(copy: AuthCopy, kind: AvatarErrorKind): string {
  if (kind === 'storage-unavailable') {
    return copy.profile.errors.photoStorageUnavailable;
  }
  if (kind === 'forbidden') return copy.profile.errors.photoForbidden;

  return copy.profile.errors.photoNetwork;
}

function serverMessageFor(copy: AuthCopy, kind: ProfileErrorKind): string {
  if (kind === 'handle-taken') return copy.profile.errors.handleTaken;
  if (kind === 'refused') return copy.profile.errors.refused;
  if (kind === 'forbidden') return copy.profile.errors.forbidden;

  return copy.profile.errors.network;
}

/**
 * Where a person names themselves: a display name and the handle everyone else
 * sees. Nothing here ever shows or asks for an e-mail.
 *
 * A whole screen, not a sheet: naming yourself is typing, and typing behind a
 * keyboard on half a screen was the reason this was hard. It arrives from the
 * right and leaves the same way, and hardware back goes back — the app has no
 * stack navigator, so this layer is the push.
 */
export function ProfileScreen({
  copy,
  profile,
  personId,
  fallbackName,
  saving,
  errorKind,
  avatarBusy,
  avatarErrorKind,
  onChangeAvatar,
  onRemoveAvatar,
  onBack,
  onSubmit,
}: ProfileScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // The app draws edge to edge, so the window never shrinks for the keyboard
  // and `KeyboardAvoidingView` has nothing to react to: the action bar rides
  // the keyboard itself, on the UI thread.
  const keyboard = useAnimatedKeyboard();
  const lift = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value,
  }));
  const handleRef = useRef<ComponentRef<typeof HandleInput>>(null);
  const fieldsRef = useRef<ComponentRef<typeof Fields>>(null);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [handle, setHandle] = useState(profile?.handle ?? '');
  const [issue, setIssue] = useState<LocalIssue | null>(null);
  // The refusal belongs to the handle that was sent; the first keystroke on a
  // new one makes it history, and the message goes with it.
  const [dismissedError, setDismissedError] = useState(false);
  const serverError = dismissedError ? null : errorKind;

  const trimmedName = displayName.trim();
  // Exactly what the account block in the tab shows, so the chip and the name
  // never disagree between the row and the screen it opened.
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
        onBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onBack]);

  // The profile can land a moment after the screen opens; the fields take it
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
    if (errorKind == null) return;

    setDismissedError(false);
    if (errorKind === 'handle-taken') handleRef.current?.focus();
  }, [errorKind]);

  const nameError =
    issue === 'display-name-required' ? messageFor(copy, issue) : null;

  const handleError =
    issue != null && issue !== 'display-name-required'
      ? messageFor(copy, issue)
      : serverError != null
      ? serverMessageFor(copy, serverError)
      : null;

  // A message nobody can see is a message that was not given: the handle field
  // is the last thing on the screen, so whenever its message appears the list
  // scrolls to the end and brings the hint and the refusal above the action
  // bar, keyboard up or not.
  useEffect(() => {
    if (handleError == null) return;

    const timeout = setTimeout(
      () => fieldsRef.current?.scrollToEnd({ animated: true }),
      50,
    );
    return () => clearTimeout(timeout);
  }, [handleError]);

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
    if (saved) onBack();
  }

  return (
    <Layer
      accessibilityViewIsModal
      entering={pushEnter()}
      exiting={pushExit()}
      style={[
        StyleSheet.absoluteFill,
        {
          paddingTop: insets.top,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      {/* The row keeps the target as wide as the words it holds: the rest of
          the top band is not a way back. */}
      <BackRow>
        <PressableScale
          accessibilityLabel={fallbackName}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          scaleTo={0.94}
          style={styles.backTarget}
          testID="profile-back"
        >
          <BackChevron>
            <ChevronGlyph color={theme.colors.text} size={18} up />
          </BackChevron>
          <BackLabel>{fallbackName}</BackLabel>
        </PressableScale>
      </BackRow>

      <Fields
        contentContainerStyle={styles.fields}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        ref={fieldsRef}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow={copy.profile.title}
          subtitle={copy.profile.subtitle}
        />

        <Preview>
          <AvatarButton
            accessibilityHint={copy.profile.changePhoto}
            accessibilityLabel={copy.profile.photoAction}
            accessibilityRole="button"
            accessibilityState={{ busy: avatarBusy }}
            disabled={avatarBusy}
            onPress={onChangeAvatar}
            testID="profile-photo"
          >
            <MemberChip
              name={previewName}
              personId={personId}
              photoURL={profile?.photoURL ?? null}
              size="xlarge"
            />
            {avatarBusy ? (
              <AvatarBusy>
                <ActivityIndicator size="small" />
              </AvatarBusy>
            ) : (
              <AvatarBadge>
                <AvatarBadgeGlyph>+</AvatarBadgeGlyph>
              </AvatarBadge>
            )}
          </AvatarButton>
          <PreviewText>
            <PreviewName numberOfLines={1} ellipsizeMode="tail">
              {previewName}
            </PreviewName>
            <PreviewHandle numberOfLines={1} ellipsizeMode="tail">
              {`@${
                handle.length > 0 ? handle : copy.profile.handlePlaceholder
              }`}
            </PreviewHandle>
            <PhotoActions>
              <PhotoAction
                accessibilityLabel={copy.profile.changePhoto}
                accessibilityRole="button"
                disabled={avatarBusy}
                onPress={onChangeAvatar}
                testID="profile-photo-change"
              >
                <PhotoActionLabel $disabled={avatarBusy}>
                  {avatarBusy
                    ? copy.profile.photoUploading
                    : copy.profile.changePhoto}
                </PhotoActionLabel>
              </PhotoAction>
              {profile?.photoURL == null ? null : (
                <PhotoAction
                  accessibilityLabel={copy.profile.removePhoto}
                  accessibilityRole="button"
                  disabled={avatarBusy}
                  onPress={onRemoveAvatar}
                  testID="profile-photo-remove"
                >
                  <PhotoActionLabel $disabled={avatarBusy}>
                    {copy.profile.removePhoto}
                  </PhotoActionLabel>
                </PhotoAction>
              )}
            </PhotoActions>
          </PreviewText>
        </Preview>

        {avatarErrorKind == null ? null : (
          <ErrorText
            accessibilityLiveRegion="polite"
            testID="profile-photo-error"
          >
            {photoMessageFor(copy, avatarErrorKind)}
          </ErrorText>
        )}

        <FieldLabel>{copy.profile.displayNameLabel}</FieldLabel>
        <Field
          $invalid={nameError != null}
          accessibilityLabel={copy.profile.displayNameLabel}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          onChangeText={value => {
            setDisplayName(value);
            setIssue(null);
            setDismissedError(true);
          }}
          placeholder={copy.profile.displayNamePlaceholder}
          returnKeyType="next"
          testID="profile-display-name"
          value={displayName}
        />
        {/* The message sits under the field it belongs to, never under the
            next one. */}
        {nameError == null ? null : (
          <ErrorText
            accessibilityLiveRegion="polite"
            testID="profile-name-error"
          >
            {nameError}
          </ErrorText>
        )}

        <FieldLabel>{copy.profile.handleLabel}</FieldLabel>
        <HandleField $invalid={handleError != null}>
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
              // Typing a different handle answers the refusal: the message
              // goes, the text stays.
              setDismissedError(true);
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

        {handleError == null ? null : (
          <ErrorText accessibilityLiveRegion="polite" testID="profile-error">
            {handleError}
          </ErrorText>
        )}
      </Fields>

      {/* The one action of the screen, always where the thumb is, always above
          the keyboard. */}
      <ActionBar style={lift}>
        <ActionBarInner style={{ paddingBottom: insets.bottom }}>
          <SheetPrimaryButton
            block
            disabled={!submittable}
            label={copy.profile.submit}
            loading={saving}
            onPress={submit}
            testID="profile-submit"
          />
        </ActionBarInner>
      </ActionBar>
    </Layer>
  );
}

const styles = StyleSheet.create({
  /* Room under the last field for the hint and the refusal it can grow, so
     neither is ever left sitting against the action bar. */
  fields: {
    paddingBottom: 96,
  },
  /* Straight onto the pressable itself: the styled wrapper was leaving the
     clickable node as wide as the band, and the top right corner is not a way
     back. `hitSlop` keeps the target past 44px. */
  /* Straight onto the pressable, not through a styled wrapper: the clickable
     node was coming out as wide as the whole band, and the top right corner is
     not a way back. 44px of height plus `hitSlop` keep the target honest. */
  backTarget: {
    alignSelf: 'flex-start',
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingLeft: 16,
    paddingRight: 8,
  },
});

const Layer = styled(Animated.View)`
  z-index: 40;
`;

/* The row itself hugs its content: whatever the pressable does with its own
   width, the box it sits in is only as wide as the chevron and the word, so
   the right side of the band can never be a way back. */
const BackRow = styled.View`
  flex-direction: row;
  align-items: center;
  align-self: flex-start;
`;

const BackChevron = styled.View`
  transform: rotate(-90deg);
`;

const BackLabel = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;

const Fields = styled.ScrollView`
  flex: 1;
  padding: 0px ${({ theme }) => theme.spacing.large}px;
`;

const ActionBar = styled(Animated.View)`
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const ActionBarInner = styled.View`
  padding: ${({ theme }) => theme.spacing.medium}px
    ${({ theme }) => theme.spacing.large}px;
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

const AvatarButton = styled.Pressable`
  width: 64px;
  height: 64px;
`;

/** Small enough to stay out of the photo's way, big enough to read as an
 * invitation to change it. */
const AvatarBadge = styled.View`
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 20px;
  height: 20px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.card};
  border: 1px solid ${({ theme }) => theme.colors.border};
  align-items: center;
  justify-content: center;
`;

const AvatarBadgeGlyph = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  line-height: ${({ theme }) => theme.type.caption + 2}px;
`;

const AvatarBusy = styled.View`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.scrim};
`;

const PreviewText = styled.View`
  flex: 1;
`;

const PhotoActions = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.medium}px;
`;

const PhotoAction = styled.Pressable`
  min-height: 44px;
  justify-content: center;
`;

/** `accentInk`, not `accent`: the yellow itself is a fill, and as a label on
 * the screen's own paper it does not hold contrast in the light theme. */
const PhotoActionLabel = styled.Text<{ $disabled: boolean }>`
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.muted : theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
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
  // The caret and selection speak the brand, not the platform default teal.
  cursorColor: theme.colors.accent,
  selectionColor: theme.colors.accent,
}))<{ $invalid?: boolean }>`
  border: 2px solid
    ${({ theme, $invalid }) =>
      $invalid === true ? theme.colors.projectCoral : theme.colors.accent};
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
  // The caret and selection speak the brand, not the platform default teal.
  cursorColor: theme.colors.accent,
  selectionColor: theme.colors.accent,
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
