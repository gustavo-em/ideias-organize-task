import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, type LayoutChangeEvent } from 'react-native';
import styled, { useTheme } from 'styled-components/native';

import {
  FRAME_FADE_MS,
  FRAME_HOLD_MS,
  type OnboardingDemo,
  type OnboardingFrame,
} from './onboardingSteps';

interface DemoPlayerProps {
  demo: OnboardingDemo;
  /** Only the page being read plays; the others sit on their first frame. */
  active: boolean;
  reducedMotion: boolean;
  /** The stage height, fixed by the screen so nothing moves under it. */
  height: number;
}

/** The ring drawn over the button the frame is pressing. */
const RING = 56;

/** Keeps a ring fully inside the frame it belongs to. */
function inside(value: number, limit: number, size: number) {
  return Math.max(0, Math.min(value, limit - size));
}

/**
 * Plays one demo: a loop of screenshots taken from the app itself, crossfading
 * into each other, with a ring over the button being pressed on each step.
 *
 * When motion is turned off — or when the page is off screen — the first frame
 * stays on screen with its ring, in the same place and at the same size.
 */
export function DemoPlayer({
  demo,
  active,
  reducedMotion,
  height,
}: DemoPlayerProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const playing = active && !reducedMotion;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  // The frame keeps the proportion of the capture and is fitted inside the
  // stage: never cropped, never scaled past what the card shows. That is what
  // keeps every ring — including the one on the new task button, at the bottom
  // of the frame — inside the visible area.
  const naturalHeight = width === 0 ? height : width / demo.aspect;
  const fit = Math.min(1, height / naturalHeight);
  const frameWidth = width * fit;
  const frameHeight = naturalHeight * fit;
  // A frame taller than the stage is centred; a shorter one sits at the top,
  // the way the brief asks the capture to fill the card from the top down.
  const top = frameHeight >= height ? (height - frameHeight) / 2 : 0;
  const left = (width - frameWidth) / 2;

  useEffect(() => {
    progress.stopAnimation();

    if (!playing) {
      progress.setValue(0);
      return;
    }

    const steps = demo.frames.map((_, index) =>
      Animated.sequence([
        Animated.delay(FRAME_HOLD_MS),
        Animated.timing(progress, {
          toValue: index + 1,
          duration: FRAME_FADE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    // The last step fades into a copy of the first frame, so the loop closes
    // without a cut.
    const loop = Animated.loop(
      Animated.sequence([
        ...steps,
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    return () => loop.stop();
  }, [demo, playing, progress]);

  useEffect(() => {
    pulse.stopAnimation();

    if (!playing) {
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );

    loop.start();

    return () => loop.stop();
  }, [playing, pulse]);

  // Each frame is fully opaque on its own beat and fades out on the next one;
  // the frame after the last one is the first one again.
  const frameOpacity = useCallback(
    (index: number) =>
      progress.interpolate({
        inputRange: [index - 1, index, index + 1],
        outputRange: [0, 1, 0],
        extrapolate: 'clamp',
      }),
    [progress],
  );

  const pulseStyle = useMemo(
    () => ({
      opacity: pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.55, 0],
      }),
      transform: [
        {
          scale: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.4],
          }),
        },
      ],
    }),
    [pulse],
  );

  const renderRing = (
    tap: OnboardingFrame['tap'],
    key: string,
    opacity: Animated.AnimatedInterpolation<number>,
  ) => {
    if (tap === undefined || width === 0) return null;

    const size = tap.size ?? RING;

    return (
      <Ring
        key={`ring-${key}`}
        pointerEvents="none"
        style={{
          borderRadius: size / 2,
          height: size,
          // Kept inside the frame: a target near the edge gets a ring touching
          // that edge instead of one sliced by the card.
          left: inside(tap.x * frameWidth - size / 2, frameWidth, size),
          opacity,
          top: inside(tap.y * frameHeight - size / 2, frameHeight, size),
          width: size,
        }}
        testID={`onboarding-tap-${key}`}
      >
        <RingFill style={{ borderRadius: size / 2 }} />
        <RingPulse
          style={[
            pulseStyle,
            {
              borderColor: theme.colors.accent,
              borderRadius: size / 2,
              height: size,
              width: size,
            },
            reducedMotion ? { opacity: 0 } : null,
          ]}
        />
      </Ring>
    );
  };

  return (
    <Stage
      onLayout={handleLayout}
      style={{ height }}
      testID={`onboarding-demo-${demo.id}`}
    >
      <Frame style={{ height: frameHeight, left, top, width: frameWidth }}>
        {demo.frames.map((frame, index) => (
          <Layer
            key={`${demo.id}-${index}`}
            style={{ opacity: frameOpacity(index) }}
          >
            <Shot
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              resizeMode="cover"
              source={frame.source}
              testID={`onboarding-frame-${demo.id}-${index}`}
            />
          </Layer>
        ))}

        {/* The loop closes on a copy of the first frame, so the last crossfade
            lands on an image instead of on an empty stage. */}
        <Layer
          key={`${demo.id}-closing`}
          style={{
            opacity: progress.interpolate({
              inputRange: [demo.frames.length - 1, demo.frames.length],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
          }}
        >
          <Shot
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            resizeMode="cover"
            source={demo.frames[0].source}
            testID={`onboarding-frame-${demo.id}-closing`}
          />
        </Layer>

        {/* The rings live above every frame, so the image of the next step
            never sits on top of the highlight of the current one. */}
        {demo.frames.map((frame, index) =>
          renderRing(frame.tap, `${demo.id}-${index}`, frameOpacity(index)),
        )}

        {/* The closing copy of the first frame carries its ring too, so the
            first step is never shown without its highlight. */}
        {renderRing(
          demo.frames[0].tap,
          `${demo.id}-closing`,
          progress.interpolate({
            inputRange: [demo.frames.length - 1, demo.frames.length],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          }),
        )}
      </Frame>
    </Stage>
  );
}

const Stage = styled.View`
  width: 100%;
  overflow: hidden;
`;

/* The frame layer keeps the capture's proportion; the stage crops it. */
const Frame = styled.View`
  position: absolute;
`;

const Layer = styled(Animated.View)`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
`;

const Shot = styled(Animated.Image)`
  width: 100%;
  height: 100%;
`;

const Ring = styled(Animated.View)`
  position: absolute;
  width: ${RING}px;
  height: ${RING}px;
  align-items: center;
  justify-content: center;
  border-radius: ${RING / 2}px;
  border-width: 2px;
  border-color: ${({ theme }) => theme.colors.accent};
`;

/* The accent at a fifth of its strength: enough to find the button, never
   enough to hide its label. */
const RingFill = styled.View`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  border-radius: ${RING / 2}px;
  background-color: ${({ theme }) => theme.colors.accent};
  opacity: 0.2;
`;

const RingPulse = styled(Animated.View)`
  position: absolute;
  width: ${RING}px;
  height: ${RING}px;
  border-radius: ${RING / 2}px;
  border-width: 2px;
`;
