import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import styled from 'styled-components/native';

import { GROUND } from '../../../../app/animation/motion';

interface StatProportionProps {
  /** Zero to one. */
  fraction: number;
}

/** A part of a whole, as one bar. The fill is the block's single accent. */
export function StatProportion({ fraction }: StatProportionProps) {
  const grown = useSharedValue(0);

  useEffect(() => {
    grown.value = withTiming(fraction, GROUND);
  }, [fraction, grown]);

  /* Scale from the left edge instead of animating width: the same reason the
     week bars scale rather than grow their height. */
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: grown.value }],
  }));

  return (
    <Track>
      <Fill style={animatedStyle} />
    </Track>
  );
}

const Track = styled.View`
  height: 6px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
  overflow: hidden;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const Fill = styled(Animated.View)`
  width: 100%;
  height: 100%;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  transform-origin: left;
  background-color: ${({ theme }) => theme.colors.accent};
`;
