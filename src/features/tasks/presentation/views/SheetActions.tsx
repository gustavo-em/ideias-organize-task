import type { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';
import styled, { useTheme } from 'styled-components/native';

import {
  buttonTextAttrs,
  buttonTextMetrics,
} from '../../../../app/theme/buttonText';
import { PressableScale } from './PressableScale';

/**
 * The row of actions at the foot of a sheet or a dialog.
 *
 * Every sheet in the app ended the same way — a quiet word on the left, the
 * coloured one on the right — and every sheet had written that row out again by
 * hand, each with its own padding. The heights drifted, the labels wrapped in
 * Portuguese, and the two buttons no longer shared a baseline.
 *
 * One row, one pair of buttons, one set of numbers, all from the scale.
 */

interface CancelProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

/** The way out. Quiet, and always first, so nothing is confirmed by reflex. */
export function SheetCancelButton({ label, onPress, testID }: CancelProps) {
  return (
    <CancelButton
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
    >
      <CancelLabel>{label}</CancelLabel>
    </CancelButton>
  );
}

interface PrimaryProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Swaps the label for a spinner without changing the button's height. */
  loading?: boolean;
  /** True only when the action cannot be undone. */
  destructive?: boolean;
  /** Fills the width of its parent, for the sheets where this button stands
   * alone instead of at the end of a row. */
  block?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

/** The action the sheet exists for. */
export function SheetPrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  destructive = false,
  block = false,
  accessibilityLabel,
  testID,
}: PrimaryProps) {
  const theme = useTheme();

  return (
    <PrimaryButton
      $block={block}
      $destructive={destructive}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          color={destructive ? theme.colors.card : theme.colors.onAccent}
          size="small"
        />
      ) : (
        <PrimaryLabel $destructive={destructive} $disabled={disabled}>
          {label}
        </PrimaryLabel>
      )}
    </PrimaryButton>
  );
}

interface RowProps {
  children: ReactNode;
}

export function SheetActionsRow({ children }: RowProps) {
  return <Row>{children}</Row>;
}

/** Pushes what follows it to the right edge of the row. */
export const SheetActionsSpacer = styled.View`
  flex: 1;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.large}px;
`;

/* Both buttons share every measure but the fill: same minimum height, same
   horizontal padding from the scale, so their labels sit on one line. */
const actionBase = `
  min-height: 48px;
  flex-shrink: 1;
  align-items: center;
  justify-content: center;
`;

const CancelButton = styled(PressableScale)`
  ${actionBase}
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
`;

const CancelLabel = styled.Text.attrs(buttonTextAttrs)`
  color: ${({ theme }) => theme.colors.mutedStrong};
  ${({ theme }) => buttonTextMetrics(theme.type.label)}
  font-weight: 700;
`;

const PrimaryButton = styled(PressableScale)<{
  $destructive: boolean;
  $block: boolean;
}>`
  ${actionBase}
  /* The one button that never gives ground: with a delete and a focus control
     beside it, a shrinking primary was the first thing pushed off the row. */
  flex-shrink: 0;
  align-self: ${({ $block }) => ($block ? 'stretch' : 'auto')};
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme, disabled, $destructive }) => {
    if (disabled) {
      return theme.colors.cardNeutral;
    }

    return $destructive ? theme.colors.danger : theme.colors.accent;
  }};
`;

const PrimaryLabel = styled.Text.attrs(buttonTextAttrs)<{
  $destructive: boolean;
  $disabled: boolean;
}>`
  /* Disabled drops the accent fill for the raised surface, so the ink from on
     top of the accent goes with it — otherwise the word all but disappears in
     the dark theme. */
  color: ${({ theme, $destructive, $disabled }) => {
    if ($disabled) {
      return theme.colors.mutedStrong;
    }

    return $destructive ? theme.colors.card : theme.colors.onAccent;
  }};
  ${({ theme }) => buttonTextMetrics(theme.type.label)}
  font-weight: 800;
`;
