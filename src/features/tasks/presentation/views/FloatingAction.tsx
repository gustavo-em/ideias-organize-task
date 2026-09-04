import styled, { useTheme } from 'styled-components/native';

import { PlusGlyph } from './FieldGlyphs';
import { PressableScale } from './PressableScale';

interface FloatingActionProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

/** The familiar, reachable primary action used by each task-oriented tab.
 * A circle and a plus: the word is spoken to a screen reader and not printed,
 * so the button never grows into a pill that covers the last row. */
export function FloatingAction({
  label,
  onPress,
  testID,
}: FloatingActionProps) {
  const theme = useTheme();

  return (
    <Fab
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.94}
      testID={testID}
    >
      <PlusGlyph color={theme.colors.onAccent} size={22} />
    </Fab>
  );
}

const Fab = styled(PressableScale)`
  position: absolute;
  right: ${({ theme }) => theme.spacing.medium + 4}px;
  bottom: ${({ theme }) => theme.spacing.medium}px;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.accent};
  elevation: 5;
  shadow-color: ${({ theme }) => theme.colors.text};
  shadow-opacity: ${({ theme }) => (theme.mode === 'dark' ? 0 : 0.18)};
  shadow-radius: 18px;
  shadow-offset: 0px 6px;
`;
