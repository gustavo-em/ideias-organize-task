import { useEffect, useState } from 'react';
import { BackHandler, Keyboard, Modal } from 'react-native';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import {
  scrimEnter,
  scrimExit,
  sheetEnter,
  sheetExit,
} from '../../../../app/animation/motion';
import { useSheetOpenTrace } from '../../../../app/perf/sheetPerf';
import type { ShareErrorKind } from '../../domain/ShareError';
import type { TaskCopy } from '../localization/taskCopy';
import { PressableScale } from './PressableScale';
import {
  SheetActionsRow,
  SheetCancelButton,
  SheetPrimaryButton,
} from './SheetActions';

interface JoinInviteSheetProps {
  copy: TaskCopy;
  status: 'idle' | 'loading' | 'error';
  errorKind: ShareErrorKind | null;
  /** Filled in when the sheet was opened by a link rather than by the button:
   * the person tapped the invite, so retyping it is work they already did. */
  initialValue?: string;
  onCancel: () => void;
  onJoin: (pastedInput: string) => void | Promise<boolean>;
  onPasteFromClipboard: () => Promise<string>;
  /** Clears a stale error once the person starts correcting the link. */
  onDismissError: () => void;
}

/** "Entrar com convite": paste a link, or the bare token, and join. Same
 * shell as `ProjectEditorSheet`. */
export function JoinInviteSheet({
  copy,
  status,
  errorKind,
  initialValue = '',
  onCancel,
  onJoin,
  onPasteFromClipboard,
  onDismissError,
}: JoinInviteSheetProps) {
  const traceOpen = useSheetOpenTrace('JoinInviteSheet');
  const theme = useTheme();
  const [value, setValue] = useState(initialValue);

  // The sheet stands on the keys when they are up. Without this it stayed
  // where it was and the keyboard covered the field, the error and both
  // buttons — everything the sheet exists to show. At rest the deeper floor
  // comes back, and the negative margin with it, so the sheet still runs off
  // the bottom of the screen instead of ending in a seam above the gesture
  // bar.
  const keyboard = useAnimatedKeyboard();
  const lift = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboard.height.value }],
    paddingBottom:
      keyboard.height.value > 0
        ? theme.spacing.large
        : theme.spacing.large + 88,
    marginBottom: keyboard.height.value > 0 ? 0 : -80,
  }));

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

  // A refusal is not a bad link. Collapsing every failure into "check the
  // link" sent people to re-read a link that was correct, while the real
  // answer was that the server said no — the same distinction ShareSheet
  // already makes on the other side of the invite.
  const errorMessage =
    errorKind === 'network'
      ? copy.lists.noNetwork
      : errorKind === 'invalid-invite'
      ? copy.lists.invalidInvite
      : copy.lists.shareRefused;

  function submit() {
    if (value.trim().length === 0) return;
    // The keyboard would otherwise sit over the error banner and the
    // footer — nothing above it reads as broken, but nothing below it is
    // reachable either.
    Keyboard.dismiss();
    onJoin(value);
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
        <Scrim entering={scrimEnter()} exiting={scrimExit()}>
          <ScrimTouch
            accessibilityLabel={copy.capture.cancel}
            accessibilityRole="button"
            onPress={onCancel}
          />
        </Scrim>
        <Sheet
          entering={sheetEnter()}
          exiting={sheetExit()}
          onLayout={traceOpen}
          style={lift}
        >
          <Grabber />
          <Title accessibilityRole="header">{copy.lists.joinInviteTitle}</Title>
          <Hint>{copy.lists.joinInviteHint}</Hint>

          <FieldRow>
            <Field
              accessibilityLabel={copy.lists.joinInvitePlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={text => {
                setValue(text);
                if (status === 'error') onDismissError();
              }}
              onSubmitEditing={submit}
              placeholder={copy.lists.joinInvitePlaceholder}
              returnKeyType="done"
              testID="join-invite-field"
              value={value}
            />
            <PasteButton
              accessibilityLabel={copy.lists.pasteFromClipboard}
              onPress={() => onPasteFromClipboard().then(setValue)}
            >
              <PasteText>{copy.lists.pasteFromClipboard}</PasteText>
            </PasteButton>
          </FieldRow>

          {status === 'error' ? (
            <ErrorBanner>
              <ErrorText>{errorMessage}</ErrorText>
              <RetryButton
                accessibilityLabel={copy.lists.tryAgain}
                hitSlop={12}
                onPress={submit}
              >
                <RetryText>{copy.lists.tryAgain}</RetryText>
              </RetryButton>
            </ErrorBanner>
          ) : null}

          <SheetActionsRow>
            <SheetCancelButton label={copy.capture.cancel} onPress={onCancel} />
            <SheetPrimaryButton
              disabled={value.trim().length === 0 || status === 'loading'}
              label={
                status === 'loading' ? copy.lists.joining : copy.lists.join
              }
              onPress={submit}
              testID="join-invite-submit"
            />
          </SheetActionsRow>
        </Sheet>
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
  z-index: 35;
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

const Sheet = styled(Animated.View)`
  background-color: ${({ theme }) => theme.colors.background};
  border-top-left-radius: ${({ theme }) => theme.radii.extraLarge}px;
  border-top-right-radius: ${({ theme }) => theme.radii.extraLarge}px;
  max-height: 91%;
  padding-top: ${({ theme }) => theme.spacing.medium}px;
  padding-left: ${({ theme }) => theme.spacing.large}px;
  padding-right: ${({ theme }) => theme.spacing.large}px;
`;

const Grabber = styled.View`
  width: 36px;
  height: 4px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.border};
  align-self: center;
  margin-bottom: ${({ theme }) => theme.spacing.medium}px;
`;

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

const FieldRow = styled.View`
  flex-direction: row;
  align-items: stretch;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Field = styled.TextInput.attrs(({ theme }) => ({
  placeholderTextColor: theme.colors.muted,
  // The caret and selection speak the brand, not the platform default teal.
  cursorColor: theme.colors.accent,
  selectionColor: theme.colors.accent,
}))`
  flex: 1;
  min-height: 48px;
  border: 2px solid ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.card};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  padding: 0px 14px;
  /* Android puts single-line text at the top of a box taller than it. */
  text-align-vertical: center;
`;

const PasteButton = styled(PressableScale)`
  min-height: 48px;
  padding: 0px 16px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.cardNeutral};
`;

const PasteText = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;

const ErrorBanner = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.small}px;
  background-color: ${({ theme }) => theme.colors.cardNeutral};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  padding: ${({ theme }) => theme.spacing.small + 4}px
    ${({ theme }) => theme.spacing.medium}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const ErrorText = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
`;

const RetryButton = styled(PressableScale)`
  padding: 8px 12px;
`;

const RetryText = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
`;
