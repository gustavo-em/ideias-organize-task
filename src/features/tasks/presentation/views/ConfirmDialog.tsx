import { useEffect } from 'react';
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
} from './SheetActions';

interface ConfirmDialogProps {
  title: string;
  body?: string;
  /** The word on the button that does the thing. */
  confirmLabel: string;
  cancelLabel: string;
  /** True when the confirmed action cannot be undone. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

/**
 * Asking before something irreversible, in the app's own voice.
 *
 * The system dialog is a stranger: it arrives in the platform's colours, its
 * own type and its own corners, in the middle of a screen composed with some
 * care. This one belongs here, behaves the same on both platforms, and puts
 * the destructive word in the colour this app already uses for danger.
 *
 * Cancel sits first and quiet; the irreversible one is the coloured button on
 * the right, so nothing is confirmed by muscle memory alone.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
  testID,
}: ConfirmDialogProps) {
  useEffect(() => {
    // Back means "never mind", never "yes".
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onCancel();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onCancel]);

  return (
    <Overlay entering={scrimEnter()} exiting={scrimExit()} testID={testID}>
      <Scrim
        accessibilityLabel={cancelLabel}
        accessibilityRole="button"
        onPress={onCancel}
      />
      <Card entering={dialogEnter()} exiting={sheetExit()}>
        <Title accessibilityRole="header">{title}</Title>
        {body == null ? null : <Body>{body}</Body>}
        <SheetActionsRow>
          <SheetCancelButton
            label={cancelLabel}
            onPress={onCancel}
            testID="confirm-cancel"
          />
          <SheetPrimaryButton
            destructive={destructive}
            label={confirmLabel}
            onPress={onConfirm}
            testID="confirm-accept"
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
