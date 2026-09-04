import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { BREATH, FADE } from '../../../../app/animation/motion';
import type { TaskCopy } from '../localization/taskCopy';

export type FocusPhase = 'running' | 'paused' | 'finished';

/** What a surface says out loud about the block it is carrying. */
export function focusStatusText(phase: FocusPhase, copy: TaskCopy): string {
  if (phase === 'paused') return copy.focus.rowPaused;
  if (phase === 'finished') return copy.focus.rowDone;

  return copy.focus.title;
}

/** mm:ss read as whole minutes, rounded up: a screen reader does not need the
 * seconds, and the minute is what a person plans around. */
export function minutesLeft(label: string): number {
  const [minutes, seconds] = label.split(':').map(Number);

  if (Number.isNaN(minutes)) return 0;

  return minutes + (Number.isNaN(seconds) || seconds === 0 ? 0 : 1);
}

/**
 * The state of a block, in six pixels.
 *
 * It breathes while the clock is actually counting and holds still the instant
 * it is paused, the same rule the session's ring follows: the stillness is what
 * says paused, so no word is needed while it runs.
 */
export function FocusDot({ phase }: { phase: FocusPhase }) {
  const theme = useTheme();
  const breath = useSharedValue(1);

  useEffect(() => {
    if (phase === 'running') {
      breath.value = withRepeat(withTiming(0.45, BREATH), -1, true);
    } else {
      breath.value = withTiming(1, FADE);
    }
  }, [breath, phase]);

  const style = useAnimatedStyle(() => ({ opacity: breath.value }));
  const tone =
    phase === 'running'
      ? theme.colors.accent
      : phase === 'paused'
      ? theme.colors.muted
      : theme.colors.success;

  return <Dot style={[style, { backgroundColor: tone }]} />;
}

const Dot = styled(Animated.View)`
  width: 6px;
  height: 6px;
  border-radius: 3px;
`;
