import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import type { TaskCopy } from '../localization/taskCopy';
import { PressableScale } from './PressableScale';

interface TrioCelebrationProps {
  copy: TaskCopy;
  streakDays: number;
  onClose: () => void;
}

/** Enough pieces to read as a burst, few enough to stay cheap on an old
 * phone. */
const PIECES = 14;

/**
 * The one big moment in the app.
 *
 * It fires for a closed trio and for nothing else. A celebration that also
 * fires for a single task is a celebration nobody believes by Thursday.
 */
export function TrioCelebration({
  copy,
  streakDays,
  onClose,
}: TrioCelebrationProps) {
  return (
    <Overlay entering={FadeIn.duration(200)} exiting={FadeOut.duration(220)}>
      <Confetti />
      <Card entering={FadeIn.delay(80).duration(260)}>
        <Title>{copy.celebration.title}</Title>
        <Body>{copy.celebration.body(streakDays)}</Body>
        <Close
          accessibilityLabel={copy.celebration.close}
          onPress={onClose}
          testID="celebration-close"
        >
          <CloseText>{copy.celebration.close}</CloseText>
        </Close>
      </Card>
    </Overlay>
  );
}

function Confetti() {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const colors = [
    theme.colors.accent,
    theme.colors.focusInk,
    theme.colors.success,
    theme.colors.danger,
  ];

  return (
    <Sky pointerEvents="none">
      {Array.from({ length: PIECES }, (_, index) => (
        <Piece
          color={colors[index % colors.length]}
          index={index}
          key={index}
          width={width}
        />
      ))}
    </Sky>
  );
}

interface PieceProps {
  index: number;
  width: number;
  color: string;
}

function Piece({ index, width, color }: PieceProps) {
  const progress = useSharedValue(0);
  // Spread by index rather than at random, so the burst looks composed and two
  // runs of the same moment look the same.
  const spread = ((index % PIECES) / (PIECES - 1) - 0.5) * width * 0.86;
  const drift = (index % 3) - 1;
  const delay = (index % 5) * 40;
  const spin = index % 2 === 0 ? 1 : -1;

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.85 ? 1 : (1 - progress.value) / 0.15,
    transform: [
      { translateX: spread * progress.value + drift * 24 * progress.value },
      { translateY: -140 * progress.value + 190 * progress.value ** 2 },
      { rotate: `${spin * 220 * progress.value}deg` },
      { scale: 0.6 + progress.value * 0.5 },
    ],
  }));

  return <Confetto style={[style, { backgroundColor: color }]} />;
}

const Overlay = styled(Animated.View)`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.scrim};
`;

const Sky = styled.View`
  position: absolute;
  top: 45%;
  left: 50%;
`;

const Confetto = styled(Animated.View)`
  position: absolute;
  width: 9px;
  height: 13px;
  border-radius: 3px;
`;

const Card = styled(Animated.View)`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.extraLarge}px;
  padding: ${({ theme }) => theme.spacing.large + 4}px;
  margin: 0px ${({ theme }) => theme.spacing.large}px;
  align-items: center;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.title}px;
  font-weight: 800;
  letter-spacing: -0.8px;
`;

const Body = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.body}px;
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.small + 2}px;
`;

const Close = styled(PressableScale)`
  background-color: ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  padding: 12px 26px;
  margin-top: ${({ theme }) => theme.spacing.large}px;
`;

const CloseText = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.label + 1}px;
  font-weight: 800;
`;
