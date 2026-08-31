import { Platform, Vibration } from 'react-native';

import type { Haptics } from '../../application/ports/Haptics';

/**
 * A buzz is never worth a failure.
 *
 * `Vibration` needs `android.permission.VIBRATE`, and a device can still
 * refuse: no motor, a battery saver, a manufacturer policy. Any of those throw
 * from native code, and the first version of this adapter let that throw land
 * in the middle of ticking a task — the one action the whole app exists for.
 * The feedback is optional; finishing something is not.
 */
function buzz(pattern: number | number[]): void {
  try {
    Vibration.vibrate(pattern, false);
  } catch {
    // A phone that will not vibrate is a phone that does not vibrate.
  }
}

/**
 * The device's own vibrator, kept deliberately short.
 *
 * React Native ships `Vibration` with no dependency to add, and iOS ignores a
 * pattern's amplitude, so the difference between the two moments is length:
 * one tick for a task, a short triple for the day closing.
 */
export const systemHaptics: Haptics = {
  tap() {
    buzz(Platform.OS === 'ios' ? 10 : 18);
  },
  celebrate() {
    // The leading zero is the wait before the first buzz, which iOS requires
    // and Android reads the same way.
    buzz([0, 24, 60, 24, 60, 40]);
  },
};
