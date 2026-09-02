import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import {
  SPLASH_EXIT,
  SPLASH_MARK,
  SPLASH_SETTLE,
  SPLASH_SETTLE_SCALE,
  SPLASH_WORDMARK,
  SPLASH_WORDMARK_DELAY_MS,
} from '../animation/motion';
import type { AppLanguage } from '../../features/tasks/presentation/localization/taskCopy';
import { AppMark, MARK_COLORS } from './AppMark';
import { AppWordmark } from './AppWordmark';

interface AppSplashProps {
  isReady: boolean;
  language: AppLanguage;
  onFinished: () => void;
}

export const SPLASH_TIMING = {
  /** The symbol arriving. */
  mark: SPLASH_MARK.duration,
  /** The symbol settling into its size, behind the arrival. */
  settle: SPLASH_SETTLE.duration,
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
    wordmark.value = withDelay(
      SPLASH_TIMING.wordmarkDelay,
      withTiming(1, SPLASH_WORDMARK),
    );

    return () => {
      cancelAnimation(mark);
      cancelAnimation(settle);
      cancelAnimation(wordmark);
    };
  }, [mark, reduceMotion, settle, wordmark]);

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
          <AppMark size={markSize} variant={isDark ? 'dark' : 'light'} />
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
