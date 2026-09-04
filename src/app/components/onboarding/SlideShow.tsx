import { useEffect, useState } from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import styled from 'styled-components/native';

/** How long each frame rests before the next one fades over it. Slow on
 * purpose: the walk-through is read, not watched. */
const HOLD_MS = 1800;
/** The crossfade between two frames. */
const FADE_MS = 380;

interface SlideShowProps {
  /** Real screenshots of the app, all in the same proportions. */
  frames: readonly ImageSourcePropType[];
  height: number;
  /** Frozen on the first frame when the device asks for less motion. */
  reducedMotion: boolean;
  testID?: string;
}

/**
 * A quiet loop of product stills — the walk-through's "gif", built from the
 * app itself. The previous frame stays mounted under the incoming one, so the
 * fade is the only thing that moves and nothing ever flashes to paper.
 */
export function SlideShow({
  frames,
  height,
  reducedMotion,
  testID,
}: SlideShowProps) {
  const [index, setIndex] = useState(0);
  // Until the loop has advanced once there is no "previous" frame: mounting
  // the last one under the first flashed the end of the demo on entry.
  const [hasLooped, setHasLooped] = useState(false);

  useEffect(() => {
    if (reducedMotion || frames.length < 2) return;

    const timer = setInterval(() => {
      setHasLooped(true);
      setIndex(previous => (previous + 1) % frames.length);
    }, HOLD_MS + FADE_MS);
    return () => clearInterval(timer);
  }, [frames.length, reducedMotion]);

  const previous = (index - 1 + frames.length) % frames.length;

  return (
    <Frame style={{ height }} testID={testID}>
      {hasLooped ? (
        <Still
          resizeMode="contain"
          source={frames[previous]}
          style={{ height }}
        />
      ) : null}
      <Overlay
        entering={FadeIn.duration(reducedMotion ? 0 : FADE_MS)}
        key={index}
      >
        <Still resizeMode="contain" source={frames[index]} style={{ height }} />
      </Overlay>
    </Frame>
  );
}

const Frame = styled.View`
  align-self: stretch;
  align-items: center;
  justify-content: center;
`;

const Overlay = styled(Animated.View)`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  align-items: center;
  justify-content: center;
`;

const Still = styled(Image)`
  width: 100%;
`;
