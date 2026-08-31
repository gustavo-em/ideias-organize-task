import { useEffect } from 'react';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

/** Enough pieces to read as a small burst without competing with the trio
 * celebration's bigger moment. */
const PIECES = 10;

/**
 * The small moment when a focus block runs out on its own.
 *
 * It never fires for a session the user stopped by hand: quitting early is
 * not a failure worth animating, and pretending otherwise is how a timer
 * turns into a scoreboard nobody trusts.
 */
interface FocusAchievementProps {
  testID?: string;
}

export function FocusAchievement({ testID }: FocusAchievementProps) {
  const theme = useTheme();
  const colors = [theme.colors.success, theme.colors.accent, theme.colors.focusInk];

  return (
    <Sky pointerEvents="none" testID={testID}>
      {Array.from({ length: PIECES }, (_, index) => (
        <Piece color={colors[index % colors.length]} index={index} key={index} />
      ))}
    </Sky>
  );
}

interface PieceProps {
  index: number;
  color: string;
}

function Piece({ index, color }: PieceProps) {
  const progress = useSharedValue(0);
  const angle = (index / PIECES) * Math.PI * 2;
  const distance = 70 + (index % 3) * 18;
  const spin = index % 2 === 0 ? 1 : -1;
  const delay = (index % 4) * 30;

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 620,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.7 ? 1 : (1 - progress.value) / 0.3,
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      { translateY: Math.sin(angle) * distance * progress.value },
      { rotate: `${spin * 180 * progress.value}deg` },
      { scale: 0.5 + progress.value * 0.6 },
    ],
  }));

  return <Confetto style={[style, { backgroundColor: color }]} />;
}

const Sky = styled.View`
  position: absolute;
  top: 50%;
  left: 50%;
`;

const Confetto = styled(Animated.View)`
  position: absolute;
  width: 7px;
  height: 10px;
  border-radius: 2px;
`;
