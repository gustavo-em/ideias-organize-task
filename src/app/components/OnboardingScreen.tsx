import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import {
  ScrollView,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';

import type { TaskCopy } from '../../features/tasks/presentation/localization/taskCopy';
import { PressableScale } from '../../features/tasks/presentation/views/PressableScale';
import { onboardingScenes } from './onboarding/onboardingSteps';

interface OnboardingScreenProps {
  copy: TaskCopy;
  onFinish: () => void;
}

/** The stage keeps the same height whether the scene plays or is frozen, so
 * turning motion off never moves the words under it. */
const STAGE_HEIGHT = 260;

/**
 * The first-run walk-through: four scenes, one idea each, shown before anyone
 * is asked for an account. Skip is on screen the whole time and lands in the
 * same place the last step does — the sign-in screen behind this one.
 */
export function OnboardingScreen({ copy, onFinish }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const window = useWindowDimensions();
  const pager = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const theme = useTheme();
  const prefersReducedMotion = useReducedMotion();

  const steps = copy.onboarding.steps;
  const total = Math.min(steps.length, onboardingScenes.length);
  const isLast = step === total - 1;
  const width = pageWidth === 0 ? window.width : pageWidth;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setPageWidth(event.nativeEvent.layout.width);
  }, []);

  // The pages are as wide as the pager, so a new measurement — the first one,
  // or a rotation — leaves the scroll offset pointing at the old page. Snapping
  // back to the current step is what keeps a step from being shown as two
  // halves.
  useEffect(() => {
    pager.current?.scrollTo({ x: step * width, animated: false });
    // Only a width change has to re-anchor: moving between steps already
    // scrolls on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(event.nativeEvent.contentOffset.x / width);
      setStep(Math.max(0, Math.min(page, total - 1)));
    },
    [total, width],
  );

  const goNext = useCallback(() => {
    if (isLast) {
      onFinish();
      return;
    }

    const next = step + 1;
    setStep(next);
    pager.current?.scrollTo({ x: next * width, animated: true });
  }, [isLast, onFinish, step, width]);

  // The scenes are drawn in the brand yellow, which is the same colour in both
  // themes; only the supporting layer follows the text colour of the theme.
  const colorFilters = [{ keypath: 'ink', color: theme.colors.text }];

  return (
    <Cover
      accessibilityViewIsModal
      importantForAccessibility="yes"
      testID="onboarding"
    >
      <Safe edges={['top', 'bottom']}>
        <Top>
          <Skip
            accessibilityLabel={copy.onboarding.skip}
            accessibilityRole="button"
            onPress={onFinish}
            testID="onboarding-skip"
          >
            <SkipText>{copy.onboarding.skip}</SkipText>
          </Skip>
        </Top>

        <Pager
          contentContainerStyle={pagerContentStyle}
          horizontal
          onLayout={handleLayout}
          onMomentumScrollEnd={handleMomentumEnd}
          pagingEnabled
          ref={pager}
          showsHorizontalScrollIndicator={false}
          testID="onboarding-pager"
        >
          {steps.slice(0, total).map((page, index) => (
            <Page key={onboardingScenes[index].id} style={{ width }}>
              <Stage
                accessible
                accessibilityLabel={copy.onboarding.stepPosition(
                  index + 1,
                  total,
                )}
                accessibilityRole="image"
              >
                {/* Only the scene being read plays: the other three sit on
                    their static frame instead of looping off screen. */}
                <LottieView
                  autoPlay={!prefersReducedMotion && index === step}
                  colorFilters={colorFilters}
                  loop={!prefersReducedMotion && index === step}
                  progress={
                    prefersReducedMotion || index !== step
                      ? onboardingScenes[index].staticProgress
                      : undefined
                  }
                  source={onboardingScenes[index].source}
                  style={stageStyle}
                  testID={`onboarding-scene-${onboardingScenes[index].id}`}
                />
              </Stage>

              <Title>{page.title}</Title>
              <Body>{page.body}</Body>
              <Example>
                <ExampleText>{page.example}</ExampleText>
              </Example>
            </Page>
          ))}
        </Pager>

        <Bottom>
          <Dots>
            {steps.slice(0, total).map((_, index) => (
              <Dot
                $active={index === step}
                key={onboardingScenes[index].id}
                testID={`onboarding-dot-${index}`}
              />
            ))}
          </Dots>

          <Next
            accessibilityLabel={
              isLast ? copy.onboarding.start : copy.onboarding.next
            }
            accessibilityRole="button"
            onPress={goNext}
            testID="onboarding-next"
          >
            <NextText pointerEvents="none">
              {isLast ? copy.onboarding.start : copy.onboarding.next}
            </NextText>
          </Next>
        </Bottom>
      </Safe>
    </Cover>
  );
}

const stageStyle = { width: '100%' as const, height: STAGE_HEIGHT };

/* The pages stretch to the pager's height, so the whole surface — animation,
   title, body and example — belongs to the scrollable content. */
const pagerContentStyle = { alignItems: 'stretch' as const };

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
`;

const Top = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  padding: ${({ theme }) => theme.spacing.tiny}px
    ${({ theme }) => theme.spacing.medium}px;
`;

const Skip = styled(PressableScale)`
  min-width: 48px;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  padding: 0px ${({ theme }) => theme.spacing.small}px;
`;

const SkipText = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;

const Pager = styled.ScrollView`
  flex: 1;
`;

/* Each page fills the pager: the drag has to work over the words as much as
   over the animation, so no part of the page can be empty space outside the
   scrollable child. The block is centred, and the two lines reserved for the
   title keep the stage from jumping between steps. */
const Page = styled.View`
  height: 100%;
  justify-content: center;
  padding: 0px ${({ theme }) => theme.spacing.large}px;
`;

const Stage = styled.View`
  height: ${STAGE_HEIGHT}px;
  align-items: center;
  justify-content: center;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.display}px;
  font-weight: 800;
  letter-spacing: -1.2px;
  line-height: ${({ theme }) => theme.type.display + 4}px;
  margin-top: ${({ theme }) => theme.spacing.extraLarge}px;
  /* Two lines of room, always: the body and the example keep the same place
     whether the title wraps or not. */
  min-height: ${({ theme }) => (theme.type.display + 4) * 2}px;
`;

const Body = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.body + 1}px;
  line-height: 23px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Example = styled.View`
  align-self: flex-start;
  background-color: ${({ theme }) => theme.colors.cardElevated};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
  padding: ${({ theme }) => theme.spacing.small}px
    ${({ theme }) => theme.spacing.medium}px;
`;

const ExampleText = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;

const Bottom = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0px ${({ theme }) => theme.spacing.large}px
    ${({ theme }) => theme.spacing.large}px;
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
  min-height: 48px;
  align-items: center;
  justify-content: center;
  padding: 0px 28px;
`;

const NextText = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.label + 1}px;
  font-weight: 800;
`;
