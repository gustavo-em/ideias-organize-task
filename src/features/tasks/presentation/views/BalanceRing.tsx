import { useEffect } from 'react';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

import { GROUND } from '../../../../app/animation/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BalanceRingProps {
  /** Zero to one: the share of everything on the phone that is already closed. */
  fraction: number;
  size?: number;
  strokeWidth?: number;
}

/**
 * The share of the board that is done, drawn once when the tab opens.
 *
 * The arc is the only accent in the block, and it is driven through
 * `strokeDashoffset` on the UI thread: the sweep costs no re-render, and the
 * timing preset carries the system's reduce-motion setting, so a phone asking
 * for less movement is handed the finished ring straight away.
 */
export function BalanceRing({
  fraction,
  size = 120,
  strokeWidth = 10,
}: BalanceRingProps) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = withTiming(fraction, GROUND);
  }, [fraction, shown]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - shown.value),
  }));

  return (
    <Svg height={size} width={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke={theme.colors.borderSubtle}
        strokeWidth={strokeWidth}
      />
      <AnimatedCircle
        animatedProps={animatedProps}
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke={theme.colors.accent}
        strokeDasharray={circumference}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
