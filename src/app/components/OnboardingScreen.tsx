import { useState } from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import type { TaskCopy } from '../../features/tasks/presentation/localization/taskCopy';
import { PressableScale } from '../../features/tasks/presentation/views/PressableScale';
import { AppMark } from './AppMark';

interface OnboardingScreenProps {
  copy: TaskCopy;
  onFinish: () => void;
}

/**
 * Three cards that say what the app refuses to do.
 *
 * It comes before anything is asked of the person — no account, no permission,
 * no list to name. The only thing waiting at the end is the day screen, which
 * is already built behind this one.
 */
export function OnboardingScreen({ copy, onFinish }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const steps = copy.onboarding.steps;
  const isLast = step === steps.length - 1;

  return (
    <Cover>
      <Safe edges={['top', 'bottom']}>
        <Top>
          <Skip accessibilityLabel={copy.onboarding.skip} onPress={onFinish}>
            <SkipText>{copy.onboarding.skip}</SkipText>
          </Skip>
        </Top>

        <Middle>
          <AppMark size={92} state={step === 0 ? 'list' : 'check'} />

          <Card
            entering={FadeIn.duration(260)}
            exiting={FadeOut.duration(140)}
            key={step}
            layout={LinearTransition.springify().damping(18)}
          >
            <Title>{steps[step].title}</Title>
            <Body>{steps[step].body}</Body>
          </Card>
        </Middle>

        <Bottom>
          <Dots>
            {steps.map((_, index) => (
              <Dot $active={index === step} key={index} />
            ))}
          </Dots>

          <Next
            accessibilityLabel={
              isLast ? copy.onboarding.start : copy.onboarding.next
            }
            onPress={() => (isLast ? onFinish() : setStep(step + 1))}
            testID="onboarding-next"
          >
            <NextText>
              {isLast ? copy.onboarding.start : copy.onboarding.next}
            </NextText>
          </Next>
        </Bottom>
      </Safe>
    </Cover>
  );
}

const Cover = styled.View`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  background-color: ${({ theme }) => theme.colors.background};
  z-index: 15;
`;

const Safe = styled(SafeAreaView)`
  flex: 1;
  padding: 0px ${({ theme }) => theme.spacing.large}px;
`;

const Top = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  padding-top: ${({ theme }) => theme.spacing.small}px;
`;

const Skip = styled(PressableScale)`
  padding: 8px 6px;
`;

const SkipText = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 600;
`;

const Middle = styled.View`
  flex: 1;
  justify-content: center;
`;

const Card = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.extraLarge}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.display}px;
  font-weight: 800;
  letter-spacing: -1.2px;
  line-height: ${({ theme }) => theme.type.display + 4}px;
`;

const Body = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.body + 1}px;
  line-height: 23px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Bottom = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-bottom: ${({ theme }) => theme.spacing.large}px;
`;

const Dots = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.small - 2}px;
`;

const Dot = styled.View<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? 22 : 7)}px;
  height: 7px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors.accent : theme.colors.border};
`;

const Next = styled(PressableScale)`
  background-color: ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  padding: 14px 28px;
`;

const NextText = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.label + 1}px;
  font-weight: 800;
`;
