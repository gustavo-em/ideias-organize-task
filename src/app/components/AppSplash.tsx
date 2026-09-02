import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import {
  SPLASH_DRAW,
  SPLASH_EXIT,
  SPLASH_MARK,
  SPLASH_SETTLE,
  SPLASH_SETTLE_SCALE,
  SPLASH_SUN,
  SPLASH_SUN_DELAY_MS,
  SPLASH_SUN_SCALE,
  SPLASH_WORDMARK,
  SPLASH_WORDMARK_DELAY_MS,
} from '../animation/motion';
import type { AppLanguage } from '../../features/tasks/presentation/localization/taskCopy';
import { MARK_ASPECT, MARK_COLORS } from './AppMark';
import { AppWordmark } from './AppWordmark';

interface AppSplashProps {
  isReady: boolean;
  language: AppLanguage;
  onFinished: () => void;
}

/** The board artwork in two layers: the letter in ink, and the sun (the
 * yellow tip of the stroke plus the three rays) that lights up over it. */
const INK_LIGHT = require('../../../assets/brand/aluza-mark-ink.png');
const INK_DARK = require('../../../assets/brand/aluza-mark-ink-dark.png');
const SUN_LAYER = require('../../../assets/brand/aluza-mark-sun.png');

/** Centre of the sun inside the mark's box, as a share of each side —
 * measured on the artwork itself, so the pop grows out of the sun's own
 * middle instead of the image's. */
const SUN_CENTER = { x: 0.603, y: 0.236 } as const;

/** Centre of the letter's ring, measured on the ink layer: the sweep that
 * draws the stroke pivots here, not on the image's own middle. */
const RING_CENTER = { x: 0.306, y: 0.577 } as const;

/** Where the visual mass of the whole symbol sits (weighted centroid). The
 * rays hang off the top-right, so centring the raw image pushed the letter
 * left of the screen's middle; this puts the mass there instead. */
const OPTICAL_CENTER = { x: 0.3704, y: 0.5733 } as const;

/** The stroke is born where the yellow tip sits — about 35° clockwise from
 * twelve o'clock — and the hand travels counter-clockwise from there. */
const DRAW_START_DEG = 35;

export const SPLASH_TIMING = {
  /** The symbol arriving. */
  mark: SPLASH_MARK.duration,
  /** The symbol settling into its size, behind the arrival. */
  settle: SPLASH_SETTLE.duration,
  /** The sun lighting up over the letter. */
  /** The letter drawing itself, one sweep around the ring. */
  draw: SPLASH_DRAW.duration,
  sunDelay: SPLASH_SUN_DELAY_MS,
  sun: SPLASH_SUN.duration,
  /** The wordmark arriving under the symbol. */
  wordmarkDelay: SPLASH_WORDMARK_DELAY_MS,
  wordmark: SPLASH_WORDMARK.duration,
  /** Floor so the brand is legible even on a fast cold start. */
  minVisible: 1250,
  fade: SPLASH_EXIT.duration,
  /** Shorter exit for when the app was ready before the floor above. */
  compact: 120,
  reducedFade: 80,
  slowState: 1500,
} as const;

const SLOW_COPY: Record<AppLanguage, string> = {
  'pt-BR': 'Abrindo o Aluza…',
  'en-US': 'Opening Aluza…',
};

/** The single, post-native cold-start transition. The artwork is the brand
 * board's own — a bitmap cut from it, never a redrawn approximation. */
export function AppSplash({ isReady, language, onFinished }: AppSplashProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const isDark = theme.mode === 'dark';
  const paper = isDark ? MARK_COLORS.ink : MARK_COLORS.cream;
  const ink = isDark ? MARK_COLORS.white : MARK_COLORS.ink;
  const mark = useSharedValue(reduceMotion ? 1 : 0);
  const settle = useSharedValue(reduceMotion ? 1 : 0);
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const sun = useSharedValue(reduceMotion ? 1 : 0);
  const wordmark = useSharedValue(reduceMotion ? 1 : 0);
  const cover = useSharedValue(1);
  const startedAt = useRef(Date.now());
  const exitStarted = useRef(false);
  const exitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSlowState, setShowSlowState] = useState(false);
  const markSize = width >= 700 ? 112 : width < 330 ? 72 : 96;

  useEffect(() => {
    if (reduceMotion) {
      mark.value = 1;
      settle.value = 1;
      wordmark.value = 1;
      return;
    }

    mark.value = withTiming(1, SPLASH_MARK);
    settle.value = withTiming(1, SPLASH_SETTLE);
    draw.value = withTiming(1, SPLASH_DRAW);
    // The sun bursts a hair past its size and settles back: lit, not placed.
    sun.value = withDelay(
      SPLASH_TIMING.sunDelay,
      withSequence(
        withTiming(1.07, SPLASH_SUN),
        withTiming(1, { duration: 140, easing: SPLASH_SUN.easing }),
      ),
    );
    wordmark.value = withDelay(
      SPLASH_TIMING.wordmarkDelay,
      withTiming(1, SPLASH_WORDMARK),
    );

    return () => {
      cancelAnimation(mark);
      cancelAnimation(settle);
      cancelAnimation(draw);
      cancelAnimation(sun);
      cancelAnimation(wordmark);
    };
  }, [draw, mark, reduceMotion, settle, sun, wordmark]);

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

  // Kept in a ref so a re-render of the app above never restarts, and never
  // cancels, the exit that is already on its way out.
  const finish = useRef(onFinished);
  finish.current = onFinished;

  useEffect(() => {
    if (!isReady || exitStarted.current) return;

    // The animation never delays the app: it runs while the app loads, and the
    // exit only waits for the floor that keeps the mark legible.
    const elapsed = Date.now() - startedAt.current;
    // The floor holds for everyone: asking for less movement asks for a still
    // mark, not for the brand to flash by.
    const wait = Math.max(0, SPLASH_TIMING.minVisible - elapsed);
    // Ready before the floor: the opening already spent its budget waiting, so
    // the fade is compressed instead of paid in full.
    const readyAfterFloor = elapsed >= SPLASH_TIMING.minVisible;
    const exitDuration = reduceMotion
      ? SPLASH_TIMING.reducedFade
      : readyAfterFloor
      ? SPLASH_TIMING.fade
      : SPLASH_TIMING.compact;

    exitStarted.current = true;

    const done = () => finish.current();
    const timeout = setTimeout(() => {
      cover.value = withTiming(
        0,
        { duration: exitDuration, easing: SPLASH_EXIT.easing },
        finished => {
          if (finished) runOnJS(done)();
        },
      );
    }, wait);
    exitTimeout.current = timeout;

    // No cleanup clearing this timeout: once the exit is committed it has to
    // land, or the cover would stay on screen forever.
  }, [cover, isReady, reduceMotion]);

  useEffect(
    () => () => {
      if (exitTimeout.current) clearTimeout(exitTimeout.current);
    },
    [],
  );

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.value,
    transform: [
      {
        scale: SPLASH_SETTLE_SCALE - (SPLASH_SETTLE_SCALE - 1) * settle.value,
      },
    ],
  }));
  const markHeight = markSize * MARK_ASPECT;
  // The sweep that draws the stroke: two paper-coloured covers, one per half
  // around the ring's centre, each swinging out counter-clockwise inside its
  // own clipped half so the stroke appears in writing order.
  const ringX = RING_CENTER.x * markSize;
  const ringY = RING_CENTER.y * markHeight;
  const wipeRadius = markSize * 0.95;
  const leftCoverStyle = useAnimatedStyle(() => {
    const angle = -Math.min(draw.value * 2, 1) * 180;

    return {
      transform: [
        { translateX: wipeRadius / 2 },
        { rotate: `${angle}deg` },
        { translateX: -wipeRadius / 2 },
      ],
    };
  });
  const rightCoverStyle = useAnimatedStyle(() => {
    const angle = -Math.max(draw.value * 2 - 1, 0) * 180;

    return {
      transform: [
        { translateX: -wipeRadius / 2 },
        { rotate: `${angle}deg` },
        { translateX: wipeRadius / 2 },
      ],
    };
  });
  // The two translations put the sun's own centre under the scale, so it
  // grows in place over the letter instead of sliding across it.
  const sunOffsetX = (SUN_CENTER.x - 0.5) * markSize;
  const sunOffsetY = (SUN_CENTER.y - 0.5) * markHeight;
  const sunStyle = useAnimatedStyle(() => {
    const lit = Math.min(sun.value, 1);

    return {
      opacity: lit,
      transform: [
        { translateX: sunOffsetX },
        { translateY: sunOffsetY },
        { scale: SPLASH_SUN_SCALE + sun.value * (1 - SPLASH_SUN_SCALE) },
        { translateX: -sunOffsetX },
        { translateY: -sunOffsetY },
      ],
    };
  });
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - wordmark.value) * 4 }],
  }));
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
        <MarkFrame style={markStyle}>
          <MarkShift
            $dx={(0.5 - OPTICAL_CENTER.x) * markSize}
            $dy={(0.5 - OPTICAL_CENTER.y) * markHeight}
          >
            <Image
              resizeMode="contain"
              source={isDark ? INK_DARK : INK_LIGHT}
              style={{ width: markSize, height: markHeight }}
            />
            {reduceMotion ? null : (
              <WipeFrame
                $radius={wipeRadius}
                $x={ringX}
                $y={ringY}
                pointerEvents="none"
              >
                <WipeHalf $left $radius={wipeRadius}>
                  <WipeCover
                    $paper={paper}
                    $radius={wipeRadius}
                    style={leftCoverStyle}
                  />
                </WipeHalf>
                <WipeHalf $left={false} $radius={wipeRadius}>
                  <WipeCover
                    $paper={paper}
                    $radius={wipeRadius}
                    style={rightCoverStyle}
                  />
                </WipeHalf>
              </WipeFrame>
            )}
            <SunLayer style={sunStyle}>
              <Image
                resizeMode="contain"
                source={SUN_LAYER}
                style={{ width: markSize, height: markHeight }}
              />
            </SunLayer>
          </MarkShift>
        </MarkFrame>

        <WordmarkFrame style={wordmarkStyle}>
          <AppWordmark height={26} variant={isDark ? 'dark' : 'light'} />
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

const MarkFrame = styled(Animated.View)`
  align-items: center;
  justify-content: center;
`;

/** Static optical correction: the symbol's mass, not its bounding box, sits
 * on the centre of the screen. */
const MarkShift = styled.View<{ $dx: number; $dy: number }>`
  transform: translate(${({ $dx }) => $dx}px, ${({ $dy }) => $dy}px);
`;

/** The sun sits exactly over the letter, in its own layer. */
const SunLayer = styled(Animated.View)`
  position: absolute;
  top: 0px;
  left: 0px;
`;

/** The wipe assembly, pre-rotated so the seam sits where the stroke is born
 * and the sweep follows the hand. Centred on the ring, sized to cover the
 * whole symbol. */
const WipeFrame = styled.View<{ $radius: number; $x: number; $y: number }>`
  position: absolute;
  left: ${({ $x, $radius }) => $x - $radius}px;
  top: ${({ $y, $radius }) => $y - $radius}px;
  width: ${({ $radius }) => $radius * 2}px;
  height: ${({ $radius }) => $radius * 2}px;
  transform: rotate(${DRAW_START_DEG}deg);
`;

/** One clipped half of the sweep: its cover can only ever paint inside it. */
const WipeHalf = styled.View<{ $left: boolean; $radius: number }>`
  position: absolute;
  left: ${({ $left, $radius }) => ($left ? 0 : $radius)}px;
  top: 0px;
  width: ${({ $radius }) => $radius}px;
  height: ${({ $radius }) => $radius * 2}px;
  overflow: hidden;
`;

/** The paper-coloured blade that swings out and reveals the stroke. */
const WipeCover = styled(Animated.View)<{ $paper: string; $radius: number }>`
  position: absolute;
  left: 0px;
  top: 0px;
  width: ${({ $radius }) => $radius}px;
  height: ${({ $radius }) => $radius * 2}px;
  background-color: ${({ $paper }) => $paper};
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
