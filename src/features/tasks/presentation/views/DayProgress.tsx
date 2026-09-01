import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import styled from 'styled-components/native';

import { CHECK_SPRING, STAGGER_MS } from '../../../../app/animation/motion';

interface DayProgressProps {
  done: number;
  total: number;
}

/**
 * The three, drawn.
 *
 * "0 de 3" is a sentence a person has to decode; three segments is a picture
 * they already understand. It is also what makes the rule of the app visible
 * without explaining it again: this many slots, this many filled, that is the
 * day.
 */
/** Past this many, separate segments become stripes nobody can count, so the
 * day turns into one bar with a fraction filled. */
const MAX_SEGMENTS = 8;

export function DayProgress({ done, total }: DayProgressProps) {
  if (total > MAX_SEGMENTS) {
    return (
      <Track
        accessibilityLabel={`${done}/${total}`}
        accessibilityRole="progressbar"
        testID="day-progress"
      >
        <Slot>
          <Fill style={{ width: `${(done / total) * 100}%` }} />
        </Slot>
      </Track>
    );
  }

  return (
    <Track
      accessibilityLabel={`${done}/${total}`}
      accessibilityRole="progressbar"
      testID="day-progress"
    >
      {Array.from({ length: total }, (_, index) => (
        <Segment filled={index < done} index={index} key={index} />
      ))}
    </Track>
  );
}

function Segment({ filled, index }: { filled: boolean; index: number }) {
  const fill = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    fill.value = withDelay(
      filled ? index * STAGGER_MS : 0,
      withSpring(filled ? 1 : 0, CHECK_SPRING),
    );
  }, [fill, filled, index]);

  const style = useAnimatedStyle(() => ({
    // The fill grows from the left rather than fading in, so finishing a task
    // reads as ground gained. Width rather than a scale, so it never needs a
    // transform origin to behave.
    width: `${fill.value * 100}%`,
  }));

  return (
    <Slot>
      <Fill style={style} />
    </Slot>
  );
}

const Track = styled.View`
  flex-direction: row;
  gap: 5px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Slot = styled.View`
  flex: 1;
  height: 7px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  /* An empty slot has to be visible, or the picture of the day only
     exists once something is done. */
  background-color: ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

const Fill = styled(Animated.View)`
  height: 100%;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.accent};
`;
