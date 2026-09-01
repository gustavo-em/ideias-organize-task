import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import styled from 'styled-components/native';

import { CHECK_SPRING } from '../../../../app/animation/motion';

interface StreakChipProps {
  label: string;
  /** Bumped once when the streak grows, so the number is seen changing rather
   * than found already changed. */
  pulseKey: number;
}

export function StreakChip({ label, pulseKey }: StreakChipProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (pulseKey === 0) return;

    pulse.value = withSequence(
      withSpring(1, CHECK_SPRING),
      withSpring(0, CHECK_SPRING),
    );
  }, [pulse, pulseKey]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.12 }],
  }));

  return (
    <Chip style={style} testID="streak-chip">
      <Label>{label}</Label>
    </Chip>
  );
}

const Chip = styled(Animated.View)`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.cardElevated};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  padding: 5px 11px;
`;

const Label = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
`;
