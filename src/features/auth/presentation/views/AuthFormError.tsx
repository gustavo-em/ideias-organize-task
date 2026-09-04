import styled, { useTheme } from 'styled-components/native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { PressableScale } from '../../../tasks/presentation/views/PressableScale';

interface AuthFormErrorProps {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

function NoticeGlyph({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 16 16" width={size}>
      <Circle
        cx={8}
        cy={8}
        fill="none"
        r={6.4}
        stroke={color}
        strokeWidth={1.5}
      />
      <Rect fill={color} height={5.6} rx={0.9} width={1.6} x={7.2} y={4.4} />
      <Circle cx={8} cy={11.4} fill={color} r={0.9} />
    </Svg>
  );
}

/** Sits above the submit button for credential and network failures — the
 * whole form's problem, not one field's, so it does not pretend to belong to
 * either input. */
export function AuthFormError({
  message,
  retryLabel,
  onRetry,
}: AuthFormErrorProps) {
  const theme = useTheme();

  return (
    <Banner accessibilityLiveRegion="polite">
      <Row>
        <NoticeGlyph color={theme.colors.accentInk} />
        <Message>{message}</Message>
      </Row>
      {onRetry == null ? null : (
        <RetryButton accessibilityLabel={retryLabel} onPress={onRetry}>
          <RetryLabel>{retryLabel}</RetryLabel>
        </RetryButton>
      )}
    </Banner>
  );
}

const Banner = styled.View`
  margin-top: ${({ theme }) => theme.spacing.large}px;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

const Message = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: 19px;
`;

const RetryButton = styled(PressableScale)`
  align-self: flex-start;
  padding: 13px 0px;
`;

const RetryLabel = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-weight: 700;
  font-size: ${({ theme }) => theme.type.label}px;
`;
