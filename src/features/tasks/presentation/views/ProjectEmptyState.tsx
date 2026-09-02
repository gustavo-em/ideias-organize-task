import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import styled from 'styled-components/native';

import { BREATH } from '../../../../app/animation/motion';

/** How much of the row's width each ghost line takes: a list that was never
 * written, drawn the way the real one would fall. */
const GHOST_WIDTHS = ['62%', '44%', '30%'] as const;

/** The wait between one line breathing and the next, so the three read as a
 * list settling rather than a block blinking. */
const GHOST_STAGGER_MS = 180;

/** The two ends of the breath, and the frame a phone asking for less motion
 * gets instead. */
const GHOST_DIM = 0.45;
const GHOST_LIT = 0.9;
const GHOST_STILL = 0.7;

interface GhostLineProps {
  step: number;
  width: `${number}%`;
}

function GhostLine({ step, width }: GhostLineProps) {
  const breath = useSharedValue(GHOST_LIT);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      breath.value = GHOST_STILL;
      return;
    }

    breath.value = withDelay(
      step * GHOST_STAGGER_MS,
      withRepeat(withTiming(GHOST_DIM, BREATH), -1, true),
    );
  }, [breath, prefersReducedMotion, step]);

  const style = useAnimatedStyle(() => ({ opacity: breath.value }));

  return <Line style={[style, { width }]} />;
}

interface ProjectEmptyStateProps {
  message: string;
}

/**
 * A project that holds nothing yet.
 *
 * Three ghost lines where its tasks would be, breathing slowly, and the same
 * sentence the screen already used. No ground of its own: the project card
 * above is the only surface here, so the state lives in the list's own space
 * and the action stays the "Adicionar primeira tarefa" below it.
 */
export function ProjectEmptyState({ message }: ProjectEmptyStateProps) {
  return (
    <Block testID="project-empty-state">
      <Ghost
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {GHOST_WIDTHS.map((width, index) => (
          <GhostLine key={width} step={index} width={width} />
        ))}
      </Ghost>
      <Message>{message}</Message>
    </Block>
  );
}

const Block = styled.View`
  padding: ${({ theme }) => theme.spacing.medium}px 0px;
`;
const Ghost = styled.View`
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-bottom: ${({ theme }) => theme.spacing.medium}px;
`;
const Line = styled(Animated.View)`
  height: 10px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
`;
const Message = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
`;
