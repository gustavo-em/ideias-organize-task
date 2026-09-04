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

/** The way out. Quiet beside the action the sheet exists for. */
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
  /** Takes whatever width the row leaves, so the action the sheet exists for
   * is the widest thing in it and Cancel stays a quiet outline beside it. */
  grow?: boolean;
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
  grow = false,
  accessibilityLabel,
  testID,
}: PrimaryProps) {
  const theme = useTheme();

  return (
    <PrimaryButton
      $block={block}
      $destructive={destructive}
      $grow={grow}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          color={destructive ? theme.colors.card : theme.colors.background}
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
  /** Tighter handoff from the last inline control in quick capture. */
  compact?: boolean;
}

export function SheetActionsRow({ children, compact = false }: RowProps) {
  return <Row $compact={compact}>{children}</Row>;
}

/** Pushes what follows it to the right edge of the row. */
export const SheetActionsSpacer = styled.View`
  flex: 1;
`;

const Row = styled.View<{ $compact: boolean }>`
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small + 2}px;
  margin-top: ${({ theme, $compact }) =>
    $compact ? theme.spacing.small + 2 : theme.spacing.large}px;
`;

/* Both buttons share every measure but the fill: same height, same radius,
   same horizontal padding, so their labels sit on one line. The primary is
   ink on paper — the darkest thing on the sheet — and Cancel is the same shape
   drawn with a hairline, so the two read as one pair and not as two products. */
const actionBase = `
  min-height: 50px;
  flex-shrink: 1;
  align-items: center;
  justify-content: center;
`;

const CancelButton = styled(PressableScale)`
  ${actionBase}
  padding: 0px ${({ theme }) => theme.spacing.medium + 2}px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.card};
`;

const CancelLabel = styled.Text.attrs(buttonTextAttrs)`
  color: ${({ theme }) => theme.colors.mutedStrong};
  ${({ theme }) => buttonTextMetrics(theme.type.label + 1)}
  font-weight: 700;
`;

const PrimaryButton = styled(PressableScale)<{
  $destructive: boolean;
  $block: boolean;
  $grow: boolean;
}>`
  ${actionBase}
  /* The one button that never gives ground: with a delete and a focus control
     beside it, a shrinking primary was the first thing pushed off the row. */
  flex-shrink: 0;
  flex-grow: ${({ $grow }) => ($grow ? 1 : 0)};
  align-self: ${({ $block }) => ($block ? 'stretch' : 'auto')};
  padding: 0px ${({ theme }) => theme.spacing.large}px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme, disabled, $destructive }) => {
    if (disabled) {
      return theme.colors.cardNeutral;
    }

    return $destructive ? theme.colors.danger : theme.colors.text;
  }};
`;

const PrimaryLabel = styled.Text.attrs(buttonTextAttrs)<{
  $destructive: boolean;
  $disabled: boolean;
}>`
  /* Disabled drops the ink fill for the neutral surface, so the paper-coloured
     label goes with it — otherwise the word all but disappears. */
  color: ${({ theme, $destructive, $disabled }) => {
    if ($disabled) {
      return theme.colors.mutedStrong;
    }

    return $destructive ? theme.colors.card : theme.colors.background;
  }};
  ${({ theme }) => buttonTextMetrics(theme.type.label + 1)}
  font-weight: 800;
`;
