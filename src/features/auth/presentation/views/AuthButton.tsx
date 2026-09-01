import { ActivityIndicator } from 'react-native';
import styled, { useTheme } from 'styled-components/native';

import { PressableScale } from '../../../tasks/presentation/views/PressableScale';

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

/** The one accent-filled action per screen. Loading swaps the label for a
 * spinner at the same size, so the button never changes height and the rest
 * of the form never jumps under it. */
export function AuthButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  testID,
}: AuthButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Button
      accessibilityLabel={label}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.onAccent} />
      ) : (
        <ButtonLabel>{label}</ButtonLabel>
      )}
    </Button>
  );
}

const Button = styled(PressableScale)`
  min-height: 52px;
  width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.accent};
  margin-top: ${({ theme }) => theme.spacing.large}px;
`;

const ButtonLabel = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 800;
`;
