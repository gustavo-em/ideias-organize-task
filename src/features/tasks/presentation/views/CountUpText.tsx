import { useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { COUNT } from '../animation/motion';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface CountUpTextProps {
  value: number;
  style?: StyleProp<TextStyle>;
  suffix?: string;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * A number that arrives at its new value instead of appearing at it.
 *
 * It is written into a read-only text field on purpose: that is the one text
 * surface React Native lets an animation drive directly, so the count runs on
 * the UI thread and never re-renders the screen around it.
 */
export function CountUpText({
  value,
  style,
  suffix = '',
  accessibilityLabel,
  testID,
}: CountUpTextProps) {
  const shown = useSharedValue(value);

  useEffect(() => {
    shown.value = withTiming(value, COUNT);
  }, [shown, value]);

  const animatedProps = useAnimatedProps(
    () =>
      ({
        text: `${Math.round(shown.value)}${suffix}`,
      } as never),
  );

  return (
    <AnimatedTextInput
      accessibilityLabel={accessibilityLabel ?? `${value}${suffix}`}
      animatedProps={animatedProps}
      defaultValue={`${value}${suffix}`}
      editable={false}
      style={[styles.field, style]}
      testID={testID}
      underlineColorAndroid="transparent"
    />
  );
}

/** A text field carries padding a text label does not, and the number has to
 * sit exactly where a `Text` would have put it. */
const styles = StyleSheet.create({ field: { padding: 0 } });
