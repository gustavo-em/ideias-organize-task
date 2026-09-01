import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

import { CHECK_SPRING, FADE } from '../../../../app/animation/motion';
import { PressableScale } from './PressableScale';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SIZE = 26;
/** Length of the tick path, used to draw it on rather than fade it in. */
const STROKE_LENGTH = 26;

const styles = StyleSheet.create({
  box: {
    width: SIZE,
    height: SIZE,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

interface TaskCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  accessibilityLabel: string;
  testID?: string;
  /** Grows the touch target past the 26px drawn box without moving anything.
   * A row can ask for the full 48px; a card that already has padding around
   * the box does not need to. */
  hitSlop?: number;
  /** On a Sol ground the default outline is invisible and the filled state
   * would be yellow on yellow. Ink does both jobs there. */
  tone?: 'default' | 'onAccent';
  /** A `viewer` in a shared project sees the box but cannot tick it. */
  disabled?: boolean;
}

/**
 * The one control the whole product is about.
 *
 * Two things happen at once when it is ticked: the box fills with the brand
 * yellow, and the tick draws itself in. Both run on the UI thread from a
 * single shared value, so they can never fall out of step with each other.
 */
export function TaskCheckbox({
  checked,
  onToggle,
  accessibilityLabel,
  testID,
  hitSlop,
  tone = 'default',
  disabled = false,
}: TaskCheckboxProps) {
  const theme = useTheme();
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = checked
      ? withSpring(1, CHECK_SPRING)
      : withTiming(0, FADE);
  }, [checked, progress]);

  const fill =
    tone === 'onAccent' ? theme.colors.onAccent : theme.colors.accent;
  const edge =
    tone === 'onAccent' ? theme.colors.onAccent : theme.colors.border;

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(0,0,0,0)', fill],
    ),
    borderColor: interpolateColor(progress.value, [0, 1], [edge, fill]),
    transform: [{ scale: 1 + Math.min(progress.value, 1) * 0.06 }],
  }));

  // The tick is drawn from its start, so the stroke appears to be written
  // rather than to appear.
  const offset = useDerivedValue(() => STROKE_LENGTH * (1 - progress.value));
  const pathProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onToggle}
      scaleTo={0.88}
      testID={testID}
    >
      <Animated.View style={[styles.box, boxStyle]}>
        <Svg height={14} width={14} viewBox="0 0 16 16">
          <AnimatedPath
            animatedProps={pathProps}
            d="M3 8.4 6.3 11.7 13 5"
            fill="none"
            stroke={
              tone === 'onAccent' ? theme.colors.accent : theme.colors.onAccent
            }
            strokeDasharray={STROKE_LENGTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.6}
          />
        </Svg>
      </Animated.View>
    </PressableScale>
  );
}
