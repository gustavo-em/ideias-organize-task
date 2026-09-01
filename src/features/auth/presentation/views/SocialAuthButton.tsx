import { ActivityIndicator } from 'react-native';
import styled, { useTheme } from 'styled-components/native';

import { PressableScale } from '../../../tasks/presentation/views/PressableScale';
import { AppleGlyph } from './brand/AppleGlyph';
import { GoogleGlyph } from './brand/GoogleGlyph';

export type SocialProvider = 'google' | 'apple';

interface SocialAuthButtonProps {
  provider: SocialProvider;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

/**
 * Google and Apple both publish sign-in button specs, and both stores read
 * them as a condition of shipping the provider. So this is the one component
 * in the app whose colours are fixed rather than themed — the surface, the
 * border, and the mark are the brand's, and only the size, radius and rhythm
 * come from the design system so the column still reads as one screen.
 */
const BRAND = {
  google: {
    light: { surface: '#FFFFFF', border: '#747775', label: '#1F1F1F' },
    dark: { surface: '#131314', border: '#8E918F', label: '#E3E3E3' },
  },
  apple: {
    light: { surface: '#000000', border: '#000000', label: '#FFFFFF' },
    dark: { surface: '#FFFFFF', border: '#FFFFFF', label: '#000000' },
  },
} as const;

export function SocialAuthButton({
  provider,
  label,
  onPress,
  loading = false,
  disabled = false,
  testID,
}: SocialAuthButtonProps) {
  const theme = useTheme();
  const palette = BRAND[provider][theme.mode];
  const isDisabled = disabled || loading;

  return (
    <Button
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={{
        backgroundColor: palette.surface,
        borderColor: palette.border,
      }}
      testID={testID}
    >
      <Content>
        {loading ? (
          <ActivityIndicator color={palette.label} />
        ) : (
          <>
            {provider === 'google' ? (
              <GoogleGlyph />
            ) : (
              <AppleGlyph color={palette.label} />
            )}
            <Label style={{ color: palette.label }}>{label}</Label>
          </>
        )}
      </Content>
    </Button>
  );
}

const Button = styled(PressableScale)`
  min-height: 52px;
  width: 100%;
  align-items: center;
  justify-content: center;
  border-width: 1px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Content = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  min-height: 50px;
`;

const Label = styled.Text`
  font-size: ${({ theme }) => theme.type.body}px;
  /* Medium, as both brand guidelines specify — heavier than this reads as a
     second primary action next to the app's own button. */
  font-weight: 500;
`;
