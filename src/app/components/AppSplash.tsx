import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import styled from 'styled-components/native';

import { brandGround } from '../theme/brandGround';
import { ALUZA_BODY, ALUZA_SPARK, ALUZA_VIEW_BOX } from './AluzaSymbol';

interface AppSplashProps {
  /** Held for later: the wipe already lands after everything the shell needs,
   * so nothing waits on these today. */
  isReady: boolean;
  language: string;
  onFinished: () => void;
}

/**
 * The opening: three list rows becoming the three rays of the mark.
 *
 * The idea is the one the brand already carries — a task is a line, and the
 * mark is made of lines that turned into light. So the rows arrive as rows
 * (ink, exactly like a task line), light up while still, and only then fly
 * into place as the rays. Lighting them mid-flight would cross the ink letter
 * in ink and lose the whole gesture for 200ms.
 *
 * The ground is Sol, not a dark screen, because the store icon is Sol with an
 * ink letter and white rays. Opening in the same paint makes tapping the icon
 * and watching this one continuous gesture: the icon grows into the screen.
 */
const DURATION_MS = 1560;

/**
 * The whole opening, in milliseconds, in the order it happens.
 *
 * Written out rather than sprinkled through the interpolations so the order is
 * something a test can hold: the rows have to light *before* they fly, the
 * mark's own rays have to take over exactly as they fade, and the wipe has to
 * be last. Break any of those and the idea stops reading, even though nothing
 * looks broken.
 */
export const SPLASH_TIMING = {
  total: DURATION_MS,
  letterOpen: 530,
  rowsIn: 265,
  rowsLit: 390,
  rowsFly: 875,
  raysTakeOver: 970,
  wordmark: 1250,
  wipe: 1310,
  /** From the second opening of the day, only the wordmark and the wipe. */
  shortFrom: 900,
  reduced: 360,
} as const;

/** The timeline above as shares of the run, which is what the interpolations
 * actually take. */
const AT = {
  letterOpen: SPLASH_TIMING.letterOpen / DURATION_MS,
  rowsIn: SPLASH_TIMING.rowsIn / DURATION_MS,
  rowsLit: SPLASH_TIMING.rowsLit / DURATION_MS,
  rowsFly: SPLASH_TIMING.rowsFly / DURATION_MS,
  raysTakeOver: SPLASH_TIMING.raysTakeOver / DURATION_MS,
  wordmark: SPLASH_TIMING.wordmark / DURATION_MS,
  wipe: SPLASH_TIMING.wipe / DURATION_MS,
} as const;

/** The one curve. Fast in, slow to settle — that is what gives it weight. */
const CURVE = Easing.bezier(0.2, 0.85, 0.15, 1);

/** From the second opening of the day the mark is already formed: only the
 * wordmark and the wipe are left. Nobody should watch the same animation ten
 * times a day. */
const SHORT_START = SPLASH_TIMING.shortFrom / DURATION_MS;
const SEEN_KEY = 'ideias.splash.seen.v1';

/** The design's frame is 176pt wide; every measure below is a share of it, so
 * the composition holds on any screen. */
const FRAME = 176;
const MARK_SIZE = 176;

/** Where the letter opens from: the middle of its bowl, not the middle of the
 * image. */
const OPEN_AT = { x: 58 / FRAME, y: 96 / FRAME };

/** The three rows, in the order they arrive. Each one starts off to the left
 * as a 64pt task row and lands as a 26pt ray, rotated onto the mark. */
const ROWS = [
  {
    from: { x: -182.7, y: 51.3 },
    at: { x: 110.7, y: 4.7 },
    angle: -80,
    lead: 0,
  },
  {
    from: { x: -211.4, y: 64.2 },
    at: { x: 139.4, y: 21.8 },
    angle: -36,
    lead: 0.03,
  },
  {
    from: { x: -219.2, y: 63.6 },
    at: { x: 147.2, y: 52.4 },
    angle: 6,
    lead: 0.06,
  },
] as const;

const ROW_HEIGHT = 9 / FRAME;
const ROW_WIDTH_START = 64 / FRAME;
const ROW_WIDTH_END = 26 / FRAME;

/** One row: ink while it waits, light while it flies. */
function Row({
  index,
  size,
  t,
}: {
  index: number;
  size: number;
  t: SharedValue<number>;
}) {
  const row = ROWS[index];
  const lead = row.lead;

  const style = useAnimatedStyle(() => {
    const width = interpolate(
      t.value,
      [AT.rowsFly - 0.28 + lead, AT.rowsFly + lead],
      [ROW_WIDTH_START * size, ROW_WIDTH_END * size],
      'clamp',
    );
    const travel = interpolate(
      t.value,
      [AT.rowsFly - 0.28 + lead, AT.rowsFly + lead],
      [1, 0],
      'clamp',
    );
    // A short bloom as it lands, then back — the only flourish in the piece.
    const bloom = interpolate(
      t.value,
      [AT.rowsFly + lead, AT.rowsFly + 0.05 + lead, AT.rowsFly + 0.08 + lead],
      [1, 1.1, 1],
      'clamp',
    );

    return {
      width,
      height: ROW_HEIGHT * size,
      opacity: interpolate(
        t.value,
        [
          AT.rowsIn + lead,
          AT.rowsLit - 0.05 + lead,
          AT.rowsFly + 0.08 + lead,
          AT.rowsFly + 0.14 + lead,
        ],
        [0, 1, 1, 0],
        'clamp',
      ),
      backgroundColor: interpolateColor(
        t.value,
        [AT.rowsLit - 0.05 + lead, AT.rowsLit + lead],
        [brandGround.tinta, '#FFFFFF'],
      ),
      transform: [
        { translateX: (row.from.x / FRAME) * size * travel },
        { translateY: (row.from.y / FRAME) * size * travel },
        {
          rotate: `${interpolate(
            t.value,
            [AT.rowsFly - 0.28 + lead, AT.rowsFly + lead],
            [0, row.angle],
            'clamp',
          )}deg`,
        },
        { scale: bloom },
      ],
    };
  });

  return (
    <RowBar
      style={[
        {
          left: (row.at.x / FRAME) * size,
          top: (row.at.y / FRAME) * size,
          borderRadius: (5 / FRAME) * size,
        },
        style,
      ]}
    />
  );
}

export function AppSplash({ onFinished }: AppSplashProps) {
  const window = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [short, setShort] = useState<boolean | null>(null);
  const finished = useRef(false);
  const t = useSharedValue(0);
  const size = Math.min(MARK_SIZE, window.width * 0.48);

  // Asked once, before anything is drawn: a full opening that turns short
  // halfway through would be worse than either.
  useEffect(() => {
    let active = true;
    const today = new Date().toDateString();

    AsyncStorage.getItem(SEEN_KEY)
      .then(seen => {
        if (active) setShort(seen === today);
        return AsyncStorage.setItem(SEEN_KEY, today);
      })
      .catch(() => {
        if (active) setShort(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (short == null) return undefined;

    const done = () => {
      if (finished.current) return;
      finished.current = true;
      onFinished();
    };

    if (reduceMotion) {
      // No morph: the mark is already whole and only the wipe runs.
      t.value = 0.62;
      t.value = withTiming(
        1,
        { duration: 360, easing: Easing.linear },
        done2 => {
          if (done2 === true) runOnJS(done)();
        },
      );

      return () => cancelAnimation(t);
    }

    t.value = short ? SHORT_START : 0;
    t.value = withTiming(
      1,
      {
        duration: short ? DURATION_MS * (1 - SHORT_START) : DURATION_MS,
        easing: CURVE,
      },
      complete => {
        if (complete === true) runOnJS(done)();
      },
    );

    return () => cancelAnimation(t);
    // The opening runs once, on its own clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [short]);

  // Data that is not ready holds the wipe at its last frame rather than
  // cutting into an app that has nothing to show. Never cut mid-morph.
  const holdStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          t.value,
          [AT.wipe, 1],
          [0, -window.height],
          'clamp',
        ),
      },
    ],
  }));

  const letterStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(t.value, [0, AT.letterOpen], [1.05, 1], 'clamp') },
    ],
  }));

  // The letter opens as a circle growing out of its own bowl. Done with a
  // round view that clips its contents rather than an SVG clip path: an
  // animated `r` on a clipPath circle never reaches the native side, so the
  // letter stayed clipped to nothing and took the whole composition with it.
  const openStyle = useAnimatedStyle(() => {
    const radius =
      interpolate(t.value, [0, AT.letterOpen], [0, 1.45], 'clamp') * size;

    return {
      width: radius * 2,
      height: radius * 2,
      borderRadius: radius,
      left: OPEN_AT.x * size - radius,
      top: OPEN_AT.y * size - radius,
    };
  });

  // Pushed back by exactly what the circle grew, so the letter under it never
  // moves while the opening does.
  const insideStyle = useAnimatedStyle(() => {
    const radius =
      interpolate(t.value, [0, AT.letterOpen], [0, 1.45], 'clamp') * size;

    return { left: radius - OPEN_AT.x * size, top: radius - OPEN_AT.y * size };
  });

  // The rays of the mark itself take over exactly as the flying rows fade:
  // the last frame is the store icon, pixel for pixel.
  const sparkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      t.value,
      [AT.rowsFly, AT.raysTakeOver],
      [0, 1],
      'clamp',
    ),
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      t.value,
      [AT.rowsFly + 0.05, AT.wordmark],
      [0, 1],
      'clamp',
    ),
    transform: [
      {
        translateY: interpolate(
          t.value,
          [AT.rowsFly + 0.05, AT.wordmark],
          [8, 0],
          'clamp',
        ),
      },
    ],
  }));

  if (short == null) return <Ground />;

  return (
    <Ground
      accessibilityLabel="Aluza"
      accessibilityRole="image"
      style={holdStyle}
      testID="app-splash"
    >
      <Stage style={{ width: size, height: size }}>
        <Animated.View style={[{ width: size, height: size }, letterStyle]}>
          <Opening style={openStyle}>
            <Inside style={insideStyle}>
              <Svg height={size} viewBox={ALUZA_VIEW_BOX} width={size}>
                <Path d={ALUZA_BODY} fill={brandGround.tinta} />
              </Svg>
            </Inside>
          </Opening>
        </Animated.View>

        <Sparks pointerEvents="none" style={sparkStyle}>
          <Svg height={size} viewBox={ALUZA_VIEW_BOX} width={size}>
            <Path d={ALUZA_SPARK} fill="#FFFFFF" fillRule="evenodd" />
          </Svg>
        </Sparks>

        {ROWS.map((_, index) => (
          <Row index={index} key={index} size={size} t={t} />
        ))}
      </Stage>

      <Wordmark style={wordStyle}>aluza</Wordmark>
    </Ground>
  );
}

const Ground = styled(Animated.View)`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  background-color: ${brandGround.sol};
  align-items: center;
  justify-content: center;
`;

const Stage = styled.View`
  position: relative;
`;

const Opening = styled(Animated.View)`
  position: absolute;
  overflow: hidden;
`;

const Inside = styled(Animated.View)`
  position: absolute;
`;

const Sparks = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
`;

const RowBar = styled(Animated.View)`
  position: absolute;
`;

const Wordmark = styled(Animated.Text)`
  margin-top: 28px;
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -2.1px;
  color: ${brandGround.onSol};
`;
