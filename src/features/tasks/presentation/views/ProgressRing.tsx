import Animated, {
  useAnimatedProps,
  useDerivedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

import { FADE } from '../animation/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** Zero to one. A shared value, so the timer can drive it every frame on the
   * UI thread instead of through React state sixty times a second. */
  fraction: SharedValue<number>;
  size: number;
  strokeWidth?: number;
  trackColor?: string;
  color?: string;
}

export function ProgressRing({
  fraction,
  size,
  strokeWidth = 9,
  trackColor,
  color,
}: ProgressRingProps) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // No dependency array: on native, Reanimated tracks the shared values the
  // worklet reads by itself, and passing one only earns a warning.
  const offset = useDerivedValue(() =>
    withTiming(circumference * (1 - fraction.value), FADE),
  );
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  return (
    <Svg height={size} width={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke={trackColor ?? theme.colors.borderSubtle}
        strokeWidth={strokeWidth}
      />
      <AnimatedCircle
        animatedProps={animatedProps}
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke={color ?? theme.colors.accent}
        strokeDasharray={circumference}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
