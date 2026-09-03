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
import { SafeAreaView } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';

import type { TaskCopy } from '../../features/tasks/presentation/localization/taskCopy';
import { PressableScale } from '../../features/tasks/presentation/views/PressableScale';
import LottieView from 'lottie-react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { onboardingSlides } from './onboarding/onboardingSteps';
import { SlideShow } from './onboarding/SlideShow';

/** What the walk-through was answered with: the invite is the only answer that
 * asks the app to do something after it closes. */
export type OnboardingOutcome = 'invite' | 'later';

interface OnboardingScreenProps {
  copy: TaskCopy;
  onFinish: (outcome: OnboardingOutcome) => void;
}

/** The stage keeps the same height whether the demo plays or is frozen, so
 * turning motion off never moves the words under it. */
const STAGE_MIN = 280;
const STAGE_MAX = 380;

/**
 * The first-run walk-through: two demos of the app itself, shown before anyone
 * is asked for an account. Skip is on screen the whole time and lands in the
 * same place the last step does — the sign-in screen behind this one.
 */
export function OnboardingScreen({ copy, onFinish }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const window = useWindowDimensions();
  const theme = useTheme();
  const pager = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const steps = copy.onboarding.steps;
  const total = Math.min(steps.length, onboardingSlides.length);
  const stageHeight = Math.round(
    Math.min(STAGE_MAX, Math.max(STAGE_MIN, window.height * 0.42)),
  );
  const isLast = step === total - 1;
  // The last page asks a question instead of moving on, so it owns the bottom
  // bar: the two answers replace the single "start" button.
  const isInviteStep = onboardingSlides[step]?.id === 'invite';
  // The couple page carries its own call to action: the partner is the whole
  // point of it, so the invite is offered right there — and again at the end.
  const isCoupleStep = onboardingSlides[step]?.id === 'couple';
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
      onFinish('later');
      return;
    }

    const next = step + 1;
    setStep(next);
    pager.current?.scrollTo({ x: next * width, animated: true });
  }, [isLast, onFinish, step, width]);

  const skip = useCallback(() => onFinish('later'), [onFinish]);
  const invite = useCallback(() => onFinish('invite'), [onFinish]);

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
            onPress={skip}
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
          {steps.slice(0, total).map((page, index) => {
            // Cada captura tem a própria proporção: o palco encolhe até a
            // moldura do slide em vez de deixar faixa vazia sob um quadro
            // mais baixo (o letterbox do slide 2).
            const slide = onboardingSlides[index];
            const stageInnerWidth = width - theme.spacing.large * 2;
            const slideStageHeight = Math.min(
              stageHeight,
              Math.round(stageInnerWidth / slide.aspect),
            );
            return (
              <Page key={slide.id} style={{ width }}>
                <GlowFrame>
                  <GlowHalo />
                  <GlowRing />
                  <Stage
                    accessible
                    accessibilityLabel={copy.onboarding.stepPosition(
                      index + 1,
                      total,
                    )}
                    accessibilityRole="image"
                    style={{ height: slideStageHeight }}
                  >
                    {slide.frames == null ? (
                      <Still
                        accessibilityIgnoresInvertColors
                        resizeMode="contain"
                        source={slide.still}
                        style={{ height: slideStageHeight }}
                        testID={`onboarding-demo-${slide.id}`}
                      />
                    ) : (
                      <SlideShow
                        frames={slide.frames}
                        height={slideStageHeight}
                        /* Only the page being read plays: the others rest. */
                        reducedMotion={prefersReducedMotion || index !== step}
                        testID={`onboarding-demo-${slide.id}`}
                      />
                    )}
                  </Stage>
                </GlowFrame>

                {slide.id === 'couple' ? (
                  <TitleRow>
                    <SparkShell
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      <Spark
                        autoPlay={!prefersReducedMotion}
                        loop={!prefersReducedMotion}
                        progress={prefersReducedMotion ? 0.5 : undefined}
                        source={require('../../../assets/lottie/shared.json')}
                      />
                    </SparkShell>
                    <Title style={titleFlex}>{page.title}</Title>
                  </TitleRow>
                ) : (
                  <Title>{page.title}</Title>
                )}
                <Body>{page.body}</Body>
                <Example>
                  <ExampleText>{page.example}</ExampleText>
                </Example>
              </Page>
            );
          })}
        </Pager>

        {isCoupleStep ? (
          <BottomStacked>
            <Dots $centered>
              {steps.slice(0, total).map((_, index) => (
                <Dot
                  $active={index === step}
                  key={onboardingSlides[index].id}
                  testID={`onboarding-dot-${index}`}
                />
              ))}
            </Dots>

            <Invite
              accessibilityLabel={copy.onboarding.coupleCta}
              accessibilityRole="button"
              onPress={invite}
              testID="onboarding-couple-invite"
            >
              <NextText pointerEvents="none">
                {copy.onboarding.coupleCta}
              </NextText>
            </Invite>

            <Later
              accessibilityLabel={copy.onboarding.next}
              accessibilityRole="button"
              onPress={goNext}
              testID="onboarding-couple-continue"
            >
              <LaterText pointerEvents="none">{copy.onboarding.next}</LaterText>
            </Later>
          </BottomStacked>
        ) : isInviteStep ? (
          /* The question owns the bottom of the page: the answer people are
             expected to want sits where the button always was, and the other
             one stays right under it, as a word rather than a wall. */
          <BottomStacked>
            <Dots $centered>
              {steps.slice(0, total).map((_, index) => (
                <Dot
                  $active={index === step}
                  key={onboardingSlides[index].id}
                  testID={`onboarding-dot-${index}`}
                />
              ))}
            </Dots>

            <Invite
              accessibilityLabel={copy.onboarding.invite.action}
              accessibilityRole="button"
              onPress={invite}
              testID="onboarding-invite"
            >
              <NextText pointerEvents="none">
                {copy.onboarding.invite.action}
              </NextText>
            </Invite>

            <Later
              accessibilityLabel={copy.onboarding.invite.later}
              accessibilityRole="button"
              onPress={skip}
              testID="onboarding-invite-later"
            >
              <LaterText pointerEvents="none">
                {copy.onboarding.invite.later}
              </LaterText>
            </Later>
          </BottomStacked>
        ) : (
          <Bottom>
            <Dots>
              {steps.slice(0, total).map((_, index) => (
                <Dot
                  $active={index === step}
                  key={onboardingSlides[index].id}
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
        )}
      </Safe>
    </Cover>
  );
}

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

/* Two soft sheets of the brand yellow behind the frame: a glow, not a box —
   what lifts the capture off the paper without inventing a new colour. */
const GlowFrame = styled.View`
  align-self: stretch;
`;

const GlowHalo = styled.View`
  position: absolute;
  top: -14px;
  left: -14px;
  right: -14px;
  bottom: -14px;
  border-radius: 34px;
  background-color: ${({ theme }) => theme.colors.accent};
  opacity: 0.16;
`;

const GlowRing = styled.View`
  position: absolute;
  top: -7px;
  left: -7px;
  right: -7px;
  bottom: -7px;
  border-radius: 27px;
  background-color: ${({ theme }) => theme.colors.accent};
  opacity: 0.38;
`;

/* A product frame: the capture sits inside a card ringed by the accent, and
   nothing spills outside it. */
const Stage = styled.View`
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: 20px;
  border-width: 2px;
  border-color: ${({ theme }) => theme.colors.accent};
  overflow: hidden;
`;

const TitleRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

const titleFlex = { flex: 1 } as const;

const SparkShell = styled.View`
  width: 44px;
  height: 44px;
  margin-top: ${({ theme }) => theme.spacing.extraLarge}px;
`;

const Spark = styled(LottieView)`
  width: 44px;
  height: 44px;
`;

/* Each page holds a single frame of the product itself — the task list, and
   the invite sheet with the link ready to send. Nothing plays. */
const Still = styled.Image`
  align-self: stretch;
  width: 100%;
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
  background-color: ${({ theme }) => theme.colors.card};
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
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

/* Same padding as the row above, stacked: the progress, the answer, and the
   way out. No surface of its own — the spacing is what groups it. */
const BottomStacked = styled.View`
  align-items: stretch;
  gap: ${({ theme }) => theme.spacing.medium}px;
  padding: 0px ${({ theme }) => theme.spacing.large}px
    ${({ theme }) => theme.spacing.large}px;
`;

const Dots = styled.View<{ $centered?: boolean }>`
  flex-direction: row;
  justify-content: ${({ $centered }) => ($centered ? 'center' : 'flex-start')};
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

const Invite = styled(PressableScale)`
  background-color: ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  padding: 0px 28px;
`;

const Later = styled(PressableScale)`
  min-height: 48px;
  align-items: center;
  justify-content: center;
`;

const LaterText = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;

const NextText = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.label + 1}px;
  font-weight: 800;
`;
