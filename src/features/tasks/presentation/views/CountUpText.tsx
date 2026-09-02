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

import { COUNT } from '../../../../app/animation/motion';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface CountUpTextProps {
  value: number;
  style?: StyleProp<TextStyle>;
  suffix?: string;
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
    /* Silent to accessibility on purpose. The field is a drawing surface, not
       a control: Android would announce it as an edit box, and the block it
       sits in already carries a written summary of the same number. */
    <AnimatedTextInput
      accessible={false}
      accessibilityElementsHidden
      animatedProps={animatedProps}
      defaultValue={`${value}${suffix}`}
      editable={false}
      focusable={false}
      /* `no` is the Android flag that takes the node out of the accessibility
         tree; `accessibilityElementsHidden` only ever did anything on iOS, and
         a parent marked `no-hide-descendants` was not enough to stop this
         field being reported as an edit box. */
      importantForAccessibility="no"
      /* Belt and braces on the platform view itself: an input that cannot be
         reached by touch, by keyboard, or by a screen reader. */
      pointerEvents="none"
      showSoftInputOnFocus={false}
      style={[styles.field, style]}
      testID={testID}
      underlineColorAndroid="transparent"
    />
  );
}

/** A text field carries padding a text label does not, and the number has to
 * sit exactly where a `Text` would have put it. */
const styles = StyleSheet.create({ field: { padding: 0 } });
