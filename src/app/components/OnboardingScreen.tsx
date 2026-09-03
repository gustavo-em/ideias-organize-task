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
import { PixelRatio } from 'react-native';
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
 * turning motion off never moves the words under it. Bounds, not a size:
 * every screen gets a share of its own height, clamped so a short phone
 * still shows the words and a tablet does not blow the frame up. */
const STAGE_MIN = 220;
const STAGE_MAX = 460;

/** Pages hold this width on wide screens (tablets, landscape), so the frame
 * and the words stay a phone-shaped column instead of stretching. */
const PAGE_MAX_WIDTH = 520;

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
  // A short screen gives the stage a smaller share, so the title, body and
  // call to action still fit under it; anything left over scrolls.
  const stageShare =
    window.height < 700 ? 0.3 : window.height < 850 ? 0.36 : 0.42;
  // On a short screen the floor itself gives way: a fixed 220dp minimum was
  // eating the whole "short screen" budget and cropping the words instead.
  const stageFloor = Math.min(STAGE_MIN, Math.round(window.height * 0.28));
  const stageHeight = Math.round(
    Math.min(STAGE_MAX, Math.max(stageFloor, window.height * stageShare)),
  );
  const fontScale = PixelRatio.getFontScale();
  const titleSize = window.width < 380 ? 28 : theme.type.display;
  const isLast = step === total - 1;
  // The last page asks a question instead of moving on, so it owns the bottom
  // bar: the two answers replace the single "start" button.
  const isInviteStep = onboardingSlides[step]?.id === 'invite';
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
          {/* The last page already offers the same exit as its own answer;
              two ways out with different names read as two features. */}
          {isInviteStep ? null : (
            <Skip
              accessibilityLabel={copy.onboarding.skip}
              accessibilityRole="button"
              onPress={skip}
              testID="onboarding-skip"
            >
              <SkipText>{copy.onboarding.skip}</SkipText>
            </Skip>
          )}
        </Top>

        <Pager
          contentContainerStyle={pagerContentStyle}
          horizontal
          onLayout={handleLayout}
          onMomentumScrollEnd={handleMomentumEnd}
          pagingEnabled
          ref={pager}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          testID="onboarding-pager"
        >
          {steps.slice(0, total).map((page, index) => {
            // Cada captura tem a própria proporção: o palco encolhe até a
            // moldura do slide em vez de deixar faixa vazia sob um quadro
            // mais baixo (o letterbox do slide 2).
            const slide = onboardingSlides[index];
            const stageInnerWidth =
              Math.min(width, PAGE_MAX_WIDTH) - theme.spacing.large * 2;
            const slideStageHeight = Math.min(
              stageHeight,
              Math.round(stageInnerWidth / slide.aspect),
            );
            // The capture is a whole phone screen, so the frame takes the
            // phone's own proportions: a small handset in the page's middle,
            // never a wide card with a band of screenshot inside it.
            const slideStageWidth = Math.round(slideStageHeight * slide.aspect);
            return (
              <Page
                contentContainerStyle={pageContentStyle}
                key={slide.id}
                showsVerticalScrollIndicator={false}
                style={{ width }}
              >
                <PageBody>
                  <GlowFrame style={{ width: slideStageWidth }}>
                    <GlowHalo />
                    <Stage
                      accessible
                      accessibilityLabel={copy.onboarding.stepPosition(
                        index + 1,
                        total,
                      )}
                      accessibilityRole="image"
                      style={{
                        height: slideStageHeight,
                        width: slideStageWidth,
                      }}
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
                    {slide.id === 'couple' ? (
                      <SparkBadge
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        <Spark
                          autoPlay={!prefersReducedMotion}
                          loop={!prefersReducedMotion}
                          progress={prefersReducedMotion ? 0.5 : undefined}
                          source={require('../../../assets/lottie/shared.json')}
                        />
                      </SparkBadge>
                    ) : null}
                  </GlowFrame>

                  <Title
                    style={{
                      fontSize: titleSize,
                      lineHeight: (titleSize + 4) * fontScale,
                      minHeight: (titleSize + 4) * 2 * fontScale,
                    }}
                  >
                    {page.title}
                  </Title>
                  <Body style={{ lineHeight: 23 * fontScale }}>
                    {page.body}
                  </Body>
                </PageBody>
              </Page>
            );
          })}
        </Pager>

        {isInviteStep ? (
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
          /* Same shape as every other page: the primary button never moves
             or changes width between steps. */
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
            </Invite>
          </BottomStacked>
        )}
      </Safe>
    </Cover>
  );
}

/* The pages stretch to the pager's height, so the whole surface — animation,
   title, body and example — belongs to the scrollable content. */
const pagerContentStyle = { alignItems: 'stretch' as const };

/* Centred while it fits; on a shorter screen the page scrolls instead of
   cropping the top of the frame or squeezing into the controls. */
const pageContentStyle = {
  flexGrow: 1,
  justifyContent: 'center' as const,
  paddingTop: 12,
  paddingBottom: 16,
};

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
const Page = styled.ScrollView`
  height: 100%;
  padding: 0px ${({ theme }) => theme.spacing.large}px;
`;

/* The phone-shaped column of the page: full width on a handset, capped and
   centred on anything wider. */
const PageBody = styled.View`
  align-self: center;
  width: 100%;
  max-width: ${PAGE_MAX_WIDTH}px;
`;

/* Two soft sheets of the brand yellow behind the frame: a glow, not a box —
   what lifts the capture off the paper without inventing a new colour. */
const GlowFrame = styled.View`
  align-self: center;
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

/* Floats over the halo's top-right corner: alive, but never pushing the
   text column out of alignment. */
const SparkBadge = styled.View`
  position: absolute;
  top: -18px;
  right: -14px;
  width: 44px;
  height: 44px;
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

/* Same padding as the row above, stacked: the progress, the answer, and the
   way out. No surface of its own — the spacing is what groups it. */
const BottomStacked = styled.View`
  align-items: stretch;
  align-self: center;
  width: 100%;
  max-width: ${PAGE_MAX_WIDTH}px;
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
