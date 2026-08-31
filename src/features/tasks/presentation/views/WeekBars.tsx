import Animated, { FadeInDown } from 'react-native-reanimated';
import styled from 'styled-components/native';

import type { DayRecord } from '../../domain/Progress';
import { STAGGER_MS } from '../animation/motion';

interface WeekBarsProps {
  week: readonly DayRecord[];
  weekdays: readonly string[];
  height?: number;
}

/**
 * Seven days of finished weight.
 *
 * The bar is weight, not count: a day with one hard thing done should not look
 * emptier than a day of five errands, because it was not.
 */
export function WeekBars({ week, weekdays, height = 96 }: WeekBarsProps) {
  const peak = Math.max(1, ...week.map(day => day.weight));

  return (
    <Wrapper>
      <Bars style={{ height }}>
        {week.map((day, index) => (
          <Column key={day.dayMs}>
            {/* The entrance and the dimming live in two views on purpose: a
                component that animates in and also sets its own opacity is
                exactly what Reanimated warns about, once per bar. */}
            <Grow
              entering={FadeInDown.delay(index * STAGGER_MS).duration(320)}
              style={{
                height: `${Math.max(4, (day.weight / peak) * 100)}%`,
              }}
            >
              <Bar $closed={day.trioClosed} />
            </Grow>
          </Column>
        ))}
      </Bars>
      <Labels>
        {week.map(day => (
          <Label key={`label-${day.dayMs}`}>
            {weekdays[new Date(day.dayMs).getDay()]}
          </Label>
        ))}
      </Labels>
    </Wrapper>
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

const Grow = styled(Animated.View)`
  width: 100%;
`;

const Bar = styled.View<{ $closed: boolean }>`
  width: 100%;
  height: 100%;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  border-bottom-left-radius: 3px;
  border-bottom-right-radius: 3px;
  background-color: ${({ theme }) => theme.colors.accent};
  opacity: ${({ $closed }) => ($closed ? 1 : 0.35)};
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
