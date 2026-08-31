import styled from 'styled-components/native';

import { PlusGlyph } from './FieldGlyphs';
import { PressableScale } from './PressableScale';

interface FloatingActionProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

/** The familiar, reachable primary action used by each task-oriented tab. */
export function FloatingAction({
  label,
  onPress,
  testID,
}: FloatingActionProps) {
  return (
    <Fab
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.94}
      testID={testID}
    >
      <PlusGlyph color="#1B1710" size={22} />
      <Label>{label}</Label>
    </Fab>
  );
}

const Fab = styled(PressableScale)`
  position: absolute;
  right: ${({ theme }) => theme.spacing.large}px;
  bottom: ${({ theme }) => theme.spacing.large}px;
  min-width: 172px;
  min-height: 54px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0px 22px 0px 18px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.accent};
  elevation: 5;
  shadow-color: #b36f00;
  shadow-opacity: ${({ theme }) => (theme.mode === 'dark' ? 0 : 0.35)};
  shadow-radius: 14px;
  shadow-offset: 0px 6px;
`;

const Label = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
  letter-spacing: -0.2px;
`;
