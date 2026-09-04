import type { ReactNode } from 'react';
import LottieView from 'lottie-react-native';
import { useReducedMotion } from 'react-native-reanimated';
import styled from 'styled-components/native';

interface ProjectEmptyStateProps {
  message: string;
  /** The small looping drawing where the tasks of an open space would be.
   * Off on the spaces index, which has nothing to draw: only the sentence
   * and the actions that answer it. */
  illustrated?: boolean;
  /** The actions that answer the sentence — on the spaces index, the pair
   * "Novo espaço" and "Entrar com convite". */
  children?: ReactNode;
}

/**
 * A space that holds nothing yet, or an index with no space of your own yet.
 *
 * One sentence in the quiet ink, the drawing when there is a place for it,
 * and the actions the caller hands over. No ground of its own: it sits on
 * the screen's floor, under whatever heading or card came before it.
 */
export function ProjectEmptyState({
  message,
  illustrated = true,
  children,
}: ProjectEmptyStateProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Block testID="project-empty-state">
      {illustrated ? (
        <AnimShell
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Anim
            autoPlay={!prefersReducedMotion}
            loop={!prefersReducedMotion}
            // A phone asking for less motion still gets the drawing, held on
            // a readable frame instead of playing.
            progress={prefersReducedMotion ? 0.5 : undefined}
            source={require('../../../../../assets/lottie/trio.json')}
          />
        </AnimShell>
      ) : null}
      <Message>{message}</Message>
      {children}
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
  font-weight: 500;
`;
