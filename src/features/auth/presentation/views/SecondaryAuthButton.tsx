import { ActivityIndicator } from 'react-native';
import styled, { useTheme } from 'styled-components/native';

import {
  buttonTextAttrs,
  buttonTextMetrics,
} from '../../../../app/theme/buttonText';
import { PressableScale } from '../../../tasks/presentation/views/PressableScale';

interface SecondaryAuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

/** An outlined action in the app's own colours: same height as the branded
 * buttons above it, one step quieter, so the order on screen still reads as
 * an order. */
export function SecondaryAuthButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  testID,
}: SecondaryAuthButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Button
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.text} />
      ) : (
        <Label>{label}</Label>
      )}
    </Button>
  );
}

const Button = styled(PressableScale)`
  min-height: 52px;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Label = styled.Text.attrs(buttonTextAttrs)`
  color: ${({ theme }) => theme.colors.text};
  ${({ theme }) => buttonTextMetrics(theme.type.body)}
  /* Same weight as the branded buttons above it: this one sits below them in
     the order, so it must not read heavier than they do. */
  font-weight: 500;
`;
