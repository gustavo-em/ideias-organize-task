import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import styled, { useTheme } from 'styled-components/native';

import type { AppLanguage } from '../../features/tasks/presentation/localization/taskCopy';
import { MARK_COLORS, MARK_GEOMETRY } from './AppMark';
import { AppWordmark } from './AppWordmark.generated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AppSplashProps {
  isReady: boolean;
  language: AppLanguage;
  onFinished: () => void;
}

export const SPLASH_TIMING = {
  morph: 420,
  fade: 140,
  compact: 180,
  reducedFade: 80,
  slowState: 1500,
} as const;

const SLOW_COPY: Record<AppLanguage, string> = {
  'pt-BR': 'Abrindo suas ideias…',
  'en-US': 'Opening your ideas…',
};

/** The single, post-native cold-start transition. */
export function AppSplash({ isReady, language, onFinished }: AppSplashProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const morph = useSharedValue(reduceMotion ? 1 : 0);
  const wordmark = useSharedValue(reduceMotion ? 1 : 0);
  const cover = useSharedValue(1);
  const startedAt = useRef(Date.now());
  const exitStarted = useRef(false);
  const [showSlowState, setShowSlowState] = useState(false);
  const markSize = width >= 700 ? 112 : width < 330 ? 72 : 96;

  useEffect(() => {
    if (reduceMotion) {
      morph.value = 1;
      wordmark.value = 1;
      return;
    }

    morph.value = withTiming(1, {
      duration: SPLASH_TIMING.morph,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
    wordmark.value = withDelay(
      60,
      withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.quad),
      }),
    );

    return () => {
      cancelAnimation(morph);
      cancelAnimation(wordmark);
    };
  }, [morph, reduceMotion, wordmark]);

  useEffect(() => {
    if (isReady) {
      setShowSlowState(false);
      return;
    }

    const timeout = setTimeout(
      () => setShowSlowState(true),
      SPLASH_TIMING.slowState,
    );
    return () => clearTimeout(timeout);
  }, [isReady]);

  useEffect(() => {
    if (!isReady || exitStarted.current) return;

    exitStarted.current = true;
    const wasMorphFinished =
      reduceMotion || Date.now() - startedAt.current >= SPLASH_TIMING.morph;
    const exitDuration = reduceMotion
      ? SPLASH_TIMING.reducedFade
      : wasMorphFinished
      ? SPLASH_TIMING.fade
      : SPLASH_TIMING.compact;

    if (!reduceMotion && !wasMorphFinished) {
      cancelAnimation(morph);
      cancelAnimation(wordmark);
      morph.value = withTiming(1, {
        duration: SPLASH_TIMING.compact,
        easing: Easing.out(Easing.cubic),
      });
      wordmark.value = withTiming(1, {
        duration: Math.min(100, exitDuration),
        easing: Easing.out(Easing.quad),
      });
    }

    cover.value = withTiming(
      0,
      {
        duration: exitDuration,
        easing: Easing.inOut(Easing.quad),
      },
      finished => {
        if (finished) runOnJS(onFinished)();
      },
    );
  }, [cover, isReady, morph, onFinished, reduceMotion, wordmark]);

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - wordmark.value) * 4 }],
  }));
  const shortCheck = useFragmentProps(morph, 'a');
  const longCheck = useFragmentProps(morph, 'b');
  const thirdFragment = useThirdFragmentProps(morph);
  const spark = useSparkProps(morph);
  const busyLabel = useMemo(() => SLOW_COPY[language], [language]);

  return (
    <Cover
      accessibilityElementsHidden={!showSlowState}
      importantForAccessibility={showSlowState ? 'yes' : 'no-hide-descendants'}
      pointerEvents="auto"
      style={coverStyle}
      testID="app-splash"
    >
      <BrandGroup>
        <Svg height={markSize} viewBox="0 0 120 120" width={markSize}>
          <Rect
            fill={MARK_COLORS.sun}
            height={120}
            rx={MARK_GEOMETRY.tileRadius}
            width={120}
          />
          <AnimatedPath
            {...strokeProps(MARK_COLORS.ink)}
            animatedProps={shortCheck}
          />
          <AnimatedPath
            {...strokeProps(MARK_COLORS.ink)}
            animatedProps={longCheck}
          />
          <AnimatedPath
            {...strokeProps(MARK_COLORS.grape)}
            animatedProps={thirdFragment}
          />
          <AnimatedPath
            animatedProps={spark}
            d={MARK_GEOMETRY.spark.path}
            fill={MARK_COLORS.grape}
          />
        </Svg>

        <WordmarkFrame style={wordmarkStyle}>
          <AppWordmark color={theme.colors.text} />
        </WordmarkFrame>
      </BrandGroup>

      {showSlowState ? (
        <BusyStatus
          accessibilityLabel={busyLabel}
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator color={MARK_COLORS.grape} size="small" />
          <BusyText>{busyLabel}</BusyText>
        </BusyStatus>
      ) : null}
    </Cover>
  );
}

function strokeProps(color: string) {
  return {
    fill: 'none' as const,
    stroke: color,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: MARK_GEOMETRY.strokeWidth,
  };
}

function useFragmentProps(morph: SharedValue<number>, key: 'a' | 'b') {
  const from = MARK_GEOMETRY.list[key];
  const to = key === 'a' ? MARK_GEOMETRY.check.short : MARK_GEOMETRY.check.long;

  return useAnimatedProps(() => {
    const value = morph.value;
    const startX = from.start.x + (to.start.x - from.start.x) * value;
    const startY = from.start.y + (to.start.y - from.start.y) * value;
    const endX = from.end.x + (to.end.x - from.end.x) * value;
    const endY = from.end.y + (to.end.y - from.end.y) * value;
    return { d: `M${startX} ${startY} L${endX} ${endY}` };
  });
}

function useThirdFragmentProps(morph: SharedValue<number>) {
  const from = MARK_GEOMETRY.list.c;
  const center = MARK_GEOMETRY.spark.center;

  return useAnimatedProps(() => {
    const value = morph.value;
    const remaining = 1 - value;
    const halfWidth = ((from.end.x - from.start.x) / 2) * remaining;
    const sourceCenterX = (from.start.x + from.end.x) / 2;
    const centerX = sourceCenterX + (center.x - sourceCenterX) * value;
    const centerY = from.start.y + (center.y - from.start.y) * value;
    return {
      d: `M${centerX - halfWidth} ${centerY} L${
        centerX + halfWidth
      } ${centerY}`,
      opacity: Math.max(0, 1 - value * 1.35),
    };
  });
}

function useSparkProps(morph: SharedValue<number>) {
  return useAnimatedProps(() => {
    const reveal = Math.max(0, Math.min(1, (morph.value - 0.55) / 0.45));
    const scale = 0.55 + reveal * 0.45;
    return {
      opacity: reveal,
      transform: `translate(92 28) scale(${scale}) translate(-92 -28)`,
    };
  });
}

const Cover = styled(Animated.View)`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.background};
  z-index: 20;
`;

const BrandGroup = styled.View`
  align-items: center;
  transform: translateY(-3px);
`;

const WordmarkFrame = styled(Animated.View)`
  align-items: center;
  justify-content: center;
  width: 79px;
  height: 32px;
  margin-top: 18px;
`;

const BusyStatus = styled.View`
  position: absolute;
  top: 68%;
  align-items: center;
  gap: 8px;
`;

const BusyText = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 13px;
  line-height: 18px;
`;
