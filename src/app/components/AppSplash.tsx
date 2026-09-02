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
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import styled, { useTheme } from 'styled-components/native';

import type { AppLanguage } from '../../features/tasks/presentation/localization/taskCopy';
import { MARK_COLORS, MARK_GEOMETRY, MARK_PATHS } from './AppMark';
import { AppWordmark } from './AppWordmark';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AppSplashProps {
  isReady: boolean;
  language: AppLanguage;
  onFinished: () => void;
}

export const SPLASH_TIMING = {
  /** The symbol contour drawing itself. */
  draw: 640,
  /** The ink filling in behind the finished contour. */
  fill: 240,
  fillDelay: 460,
  /** The yellow detail lighting up. */
  spark: 260,
  sparkDelay: 520,
  /** The wordmark arriving under the symbol. */
  wordmark: 200,
  wordmarkDelay: 620,
  /** Floor so the brand is legible even on a fast cold start. */
  minVisible: 900,
  fade: 140,
  /** Shorter exit for when the app was ready before the floor above. */
  compact: 100,
  reducedFade: 80,
  slowState: 1500,
} as const;

const SLOW_COPY: Record<AppLanguage, string> = {
  'pt-BR': 'Abrindo o Aluza…',
  'en-US': 'Opening Aluza…',
};

const OUTLINE_LENGTH = MARK_GEOMETRY.outlineLength;
const SYMBOL_CANVAS = MARK_GEOMETRY.size.width;
/** Contour weight in view-box units: thin enough not to thicken the mark. */
const OUTLINE_WIDTH = Math.round(SYMBOL_CANVAS * 0.012);

/** The single, post-native cold-start transition. */
export function AppSplash({ isReady, language, onFinished }: AppSplashProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const isDark = theme.mode === 'dark';
  const paper = isDark ? MARK_COLORS.ink : MARK_COLORS.cream;
  const ink = isDark ? MARK_COLORS.white : MARK_COLORS.ink;
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const fill = useSharedValue(reduceMotion ? 1 : 0);
  const spark = useSharedValue(reduceMotion ? 1 : 0);
  const wordmark = useSharedValue(reduceMotion ? 1 : 0);
  const cover = useSharedValue(1);
  const startedAt = useRef(Date.now());
  const exitStarted = useRef(false);
  const [showSlowState, setShowSlowState] = useState(false);
  const markSize = width >= 700 ? 112 : width < 330 ? 72 : 96;

  useEffect(() => {
    if (reduceMotion) {
      draw.value = 1;
      fill.value = 1;
      spark.value = 1;
      wordmark.value = 1;
      return;
    }

    draw.value = withTiming(1, {
      duration: SPLASH_TIMING.draw,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
    fill.value = withDelay(
      SPLASH_TIMING.fillDelay,
      withTiming(1, {
        duration: SPLASH_TIMING.fill,
        easing: Easing.out(Easing.quad),
      }),
    );
    spark.value = withDelay(
      SPLASH_TIMING.sparkDelay,
      withTiming(1, {
        duration: SPLASH_TIMING.spark,
        easing: Easing.out(Easing.back(1.4)),
      }),
    );
    wordmark.value = withDelay(
      SPLASH_TIMING.wordmarkDelay,
      withTiming(1, {
        duration: SPLASH_TIMING.wordmark,
        easing: Easing.out(Easing.quad),
      }),
    );

    return () => {
      cancelAnimation(draw);
      cancelAnimation(fill);
      cancelAnimation(spark);
      cancelAnimation(wordmark);
    };
  }, [draw, fill, reduceMotion, spark, wordmark]);

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

    // The animation never delays the app: it runs while the app loads, and the
    // exit only waits for the floor that keeps the mark legible.
    const elapsed = Date.now() - startedAt.current;
    const wait = reduceMotion
      ? 0
      : Math.max(0, SPLASH_TIMING.minVisible - elapsed);
    // Ready before the floor: the opening already spent its budget waiting, so
    // the fade is compressed instead of paid in full.
    const readyAfterFloor = elapsed >= SPLASH_TIMING.minVisible;
    const exitDuration = reduceMotion
      ? SPLASH_TIMING.reducedFade
      : readyAfterFloor
      ? SPLASH_TIMING.fade
      : SPLASH_TIMING.compact;

    exitStarted.current = true;

    const timeout = setTimeout(() => {
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
    }, wait);

    return () => clearTimeout(timeout);
  }, [cover, isReady, onFinished, reduceMotion]);

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - wordmark.value) * 4 }],
  }));
  const outlineProps = useAnimatedProps(() => ({
    strokeDashoffset: OUTLINE_LENGTH * (1 - draw.value),
  }));
  const inkProps = useAnimatedProps(() => ({ fillOpacity: fill.value }));
  const sparkProps = useAnimatedProps(() => {
    const scale = 0.6 + spark.value * 0.4;
    const { x, y } = MARK_GEOMETRY.sunCenter;
    return {
      opacity: spark.value,
      transform: `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`,
    };
  });
  const busyLabel = useMemo(() => SLOW_COPY[language], [language]);

  return (
    <Cover
      $paper={paper}
      accessibilityElementsHidden={!showSlowState}
      importantForAccessibility={showSlowState ? 'yes' : 'no-hide-descendants'}
      pointerEvents="auto"
      style={coverStyle}
      testID="app-splash"
    >
      <BrandGroup>
        <Svg height={markSize} viewBox={MARK_GEOMETRY.viewBox} width={markSize}>
          <AnimatedPath
            animatedProps={inkProps}
            d={MARK_PATHS.ink}
            fill={ink}
            fillRule="evenodd"
          />
          <AnimatedPath
            animatedProps={outlineProps}
            d={MARK_PATHS.ink}
            fill="none"
            stroke={ink}
            strokeDasharray={OUTLINE_LENGTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={OUTLINE_WIDTH}
          />
          <AnimatedPath
            animatedProps={sparkProps}
            d={MARK_PATHS.sun}
            fill={MARK_COLORS.sun}
            fillRule="evenodd"
          />
        </Svg>

        <WordmarkFrame style={wordmarkStyle}>
          <AppWordmark color={ink} height={26} />
        </WordmarkFrame>
      </BrandGroup>

      {showSlowState ? (
        <BusyStatus
          accessibilityLabel={busyLabel}
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator color={ink} size="small" />
          <BusyText $ink={ink}>{busyLabel}</BusyText>
        </BusyStatus>
      ) : null}
    </Cover>
  );
}

/** The kit's cream, the same colour the native launch window paints, so the
 * opening never flashes or changes brand between the two. */
const Cover = styled(Animated.View)<{ $paper: string }>`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  align-items: center;
  justify-content: center;
  background-color: ${({ $paper }) => $paper};
  z-index: 20;
`;

const BrandGroup = styled.View`
  align-items: center;
`;

const WordmarkFrame = styled(Animated.View)`
  align-items: center;
  justify-content: center;
  margin-top: 18px;
`;

const BusyStatus = styled.View`
  position: absolute;
  top: 68%;
  align-items: center;
  gap: 8px;
`;

const BusyText = styled.Text<{ $ink: string }>`
  color: ${({ $ink }) => $ink};
  font-size: 13px;
  line-height: 18px;
  opacity: 0.72;
`;
