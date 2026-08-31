import type { ReactNode } from 'react';
import type { AccessibilityRole, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { PRESS_SPRING } from '../animation/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({ disabled: { opacity: 0.45 } });

interface PressableScaleProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: {
    selected?: boolean;
    checked?: boolean;
    /** Set by a control that opens a panel below itself, so a screen reader
     * says whether the panel is open. */
    expanded?: boolean;
  };
  style?: StyleProp<ViewStyle>;
  /** Widens the touch area past the drawn one, for controls small enough that
   * a fingertip covers them entirely. */
  hitSlop?: number;
  /** How far it sinks. Bigger controls move less: the same 4% on a full-width
   * card reads as the screen wobbling. */
  scaleTo?: number;
  testID?: string;
}

/**
 * Anything tappable in this app.
 *
 * The scale runs on the UI thread, so it answers even while the JavaScript
 * side is busy saving or parsing — which is exactly when a button that does
 * nothing feels broken.
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  style,
  scaleTo = 0.96,
  hitSlop,
  testID,
}: PressableScaleProps) {
  const pressed = useSharedValue(0);
  // Only the scale is animated. Putting opacity in here too made Reanimated
  // warn on every one of these that sits inside a layout animation — and a
  // dimmed disabled control does not need a worklet to be dim.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
  }));

  return (
    <AnimatedPressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        pressed.value = withSpring(1, PRESS_SPRING);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, PRESS_SPRING);
      }}
      style={[style, disabled ? styles.disabled : null, animatedStyle]}
      testID={testID}
    >
      {children}
    </AnimatedPressable>
  );
}
