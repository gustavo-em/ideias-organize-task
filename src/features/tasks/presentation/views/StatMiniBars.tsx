import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import styled from 'styled-components/native';

import { GROUND } from '../../../../app/animation/motion';

interface StatMiniBarsProps {
  /** One value per weekday, Sunday first. */
  values: readonly number[];
  /** The weekday that wins, or null while nothing has been closed. */
  best: number | null;
  labels: readonly string[];
}

/**
 * Seven segments, one per weekday, sized by how much was finished on each.
 *
 * Only the winning segment carries the accent; the rest are the same rule the
 * rest of the app uses for a hairline, so the pattern reads at a glance and
 * still says nothing when there is no pattern yet.
 */
export function StatMiniBars({ values, best, labels }: StatMiniBarsProps) {
  const peak = Math.max(1, ...values);

  return (
    <Wrapper>
      <Row>
        {values.map((value, weekday) => (
          <Segment
            key={labels[weekday] + String(weekday)}
            fraction={Math.max(0.15, value / peak)}
            isBest={best === weekday}
          />
        ))}
      </Row>
      <Labels>
        {labels.map((label, weekday) => (
          <Label key={label + String(weekday)}>{label}</Label>
        ))}
      </Labels>
    </Wrapper>
  );
}

function Segment({ fraction, isBest }: { fraction: number; isBest: boolean }) {
  const grown = useSharedValue(0);

  useEffect(() => {
    grown.value = withTiming(fraction, GROUND);
  }, [fraction, grown]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: grown.value }],
  }));

  return (
    <SegmentTrack>
      <SegmentBar $best={isBest} style={animatedStyle} />
    </SegmentTrack>
  );
}

const Wrapper = styled.View`
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: flex-end;
  height: 14px;
  gap: 3px;
`;

const SegmentTrack = styled.View`
  flex: 1;
  height: 100%;
  justify-content: flex-end;
`;

const SegmentBar = styled(Animated.View)<{ $best: boolean }>`
  width: 100%;
  height: 100%;
  min-height: 6px;
  border-radius: 3px;
  transform-origin: bottom;
  background-color: ${({ theme, $best }) =>
    $best ? theme.colors.accent : theme.colors.borderSubtle};
`;

const Labels = styled.View`
  flex-direction: row;
  gap: 3px;
  margin-top: 5px;
`;

const Label = styled.Text`
  flex: 1;
  text-align: center;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption - 1}px;
  font-weight: 600;
`;
