import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import styled from 'styled-components/native';

import { GROUND } from '../../../../app/animation/motion';
import type { ClosedDay } from '../../domain/TaskStats';

interface WeekBarsProps {
  days: readonly ClosedDay[];
  todayMs: number;
  weekdays: readonly string[];
  height?: number;
}

/**
 * Seven days of finished tasks.
 *
 * The bars grow from the floor when the tab opens, and only today is at full
 * strength: one accent per chart, so the eye lands on the day the person is
 * still living instead of hunting for the tallest column.
 */
export function WeekBars({
  days,
  todayMs,
  weekdays,
  height = 96,
}: WeekBarsProps) {
  const peak = Math.max(1, ...days.map(day => day.closed));

  return (
    <Wrapper>
      <Bars style={{ height }}>
        {days.map(day => (
          <Column key={day.dayMs}>
            <GrowingBar
              isToday={day.dayMs === todayMs}
              /* A floor of 4% keeps the row of days readable when nothing was
                 closed: an empty week is still a week. */
              fraction={Math.max(0.04, day.closed / peak)}
            />
          </Column>
        ))}
      </Bars>
      <Labels>
        {days.map(day => (
          <Label key={`label-${day.dayMs}`}>
            {weekdays[new Date(day.dayMs).getDay()]}
          </Label>
        ))}
      </Labels>
    </Wrapper>
  );
}

function GrowingBar({
  fraction,
  isToday,
}: {
  fraction: number;
  isToday: boolean;
}) {
  const grown = useSharedValue(0);

  useEffect(() => {
    grown.value = withTiming(fraction, GROUND);
  }, [fraction, grown]);

  /* Scale rather than height: a transform runs on the compositor, and a column
     of seven animated heights is seven layout passes a frame. */
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: grown.value }],
  }));

  return (
    <Bar $today={isToday} style={animatedStyle}>
      <BarFill />
    </Bar>
  );
}

const Wrapper = styled.View`
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Bars = styled.View`
  flex-direction: row;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing.small - 1}px;
`;

const Column = styled.View`
  flex: 1;
  height: 100%;
  justify-content: flex-end;
`;

const Bar = styled(Animated.View)<{ $today: boolean }>`
  width: 100%;
  height: 100%;
  transform-origin: bottom;
  opacity: ${({ $today }) => ($today ? 1 : 0.35)};
`;

const BarFill = styled.View`
  width: 100%;
  height: 100%;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  border-bottom-left-radius: 3px;
  border-bottom-right-radius: 3px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const Labels = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.small - 1}px;
  margin-top: ${({ theme }) => theme.spacing.small - 1}px;
`;

const Label = styled.Text`
  flex: 1;
  text-align: center;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption - 1}px;
  font-weight: 600;
`;
