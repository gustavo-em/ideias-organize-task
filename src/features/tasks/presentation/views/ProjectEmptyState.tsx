import LottieView from 'lottie-react-native';
import { useReducedMotion } from 'react-native-reanimated';
import styled from 'styled-components/native';

interface ProjectEmptyStateProps {
  message: string;
}

/**
 * A project that holds nothing yet.
 *
 * A small looping animation where its tasks would be, and the same sentence
 * the screen already used. No ground of its own: the project card above is the
 * only surface here, so the state lives in the list's own space and the action
 * stays the "Adicionar primeira tarefa" below it.
 */
export function ProjectEmptyState({ message }: ProjectEmptyStateProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Block testID="project-empty-state">
      <AnimShell
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Anim
          autoPlay={!prefersReducedMotion}
          loop={!prefersReducedMotion}
          // A phone asking for less motion still gets the drawing, held on a
          // readable frame instead of playing.
          progress={prefersReducedMotion ? 0.5 : undefined}
          source={require('../../../../../assets/lottie/trio.json')}
        />
      </AnimShell>
      <Message>{message}</Message>
    </Block>
  );
}

const Block = styled.View`
  padding: ${({ theme }) => theme.spacing.medium}px 0px;
`;

const AnimShell = styled.View`
  margin-bottom: ${({ theme }) => theme.spacing.small}px;
`;

const Anim = styled(LottieView)`
  width: 132px;
  height: 96px;
`;

const Message = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
`;
