import styled, { useTheme } from 'styled-components/native';

import { PlusGlyph } from './FieldGlyphs';
import { PressableScale } from './PressableScale';

interface FloatingActionProps {
  label: string;
  onPress: () => void;
  testID?: string;
  /**
   * Prints the label beside the plus instead of only speaking it.
   *
   * Reserved for the one place where "+" alone is ambiguous: inside a group,
   * where the same gesture could mean "a task here" or "a task in the space".
   * A tab has no such question — its plus can only mean one thing — so it
   * keeps the circle and the word stays spoken.
   */
  extended?: boolean;
  /** The fill, when the action belongs to something with a colour of its own.
   * Defaults to the accent every tab uses. */
  tone?: string;
  /** What is drawn on that fill. */
  ink?: string;
}

/** The familiar, reachable primary action used by each task-oriented tab.
 * A circle and a plus, so the button never grows into a pill that covers the
 * last row — except where naming its target is the point. */
export function FloatingAction({
  label,
  onPress,
  testID,
  extended = false,
  tone,
  ink,
}: FloatingActionProps) {
  const theme = useTheme();
  const fill = tone ?? theme.colors.accent;
  const symbol = ink ?? theme.colors.onAccent;

  return (
    <Fab
      $extended={extended}
      $tone={fill}
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.94}
      testID={testID}
    >
      <PlusGlyph color={symbol} size={extended ? 16 : 22} />
      {extended ? <FabLabel $ink={symbol}>{label}</FabLabel> : null}
    </Fab>
  );
}

const Fab = styled(PressableScale)<{ $extended: boolean; $tone: string }>`
  position: absolute;
  right: ${({ theme }) => theme.spacing.medium + 4}px;
  bottom: ${({ theme }) => theme.spacing.medium}px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme, $extended }) => ($extended ? theme.spacing.small + 1 : 0)}px;
  ${({ $extended, theme }) =>
    $extended
      ? `height: 52px; padding: 0px ${
          theme.spacing.medium + 4
        }px; border-radius: ${theme.radii.medium + 1}px;`
      : `width: 56px; height: 56px; border-radius: ${theme.radii.pill}px;`}
  background-color: ${({ $tone }) => $tone};
  elevation: 5;
  shadow-color: ${({ theme }) => theme.colors.text};
  shadow-opacity: ${({ theme }) => (theme.mode === 'dark' ? 0 : 0.18)};
  shadow-radius: 18px;
  shadow-offset: 0px 6px;
`;

const FabLabel = styled.Text<{ $ink: string }>`
  color: ${({ $ink }) => $ink};
  font-size: ${({ theme }) => theme.type.label + 1}px;
  font-weight: 800;
`;
