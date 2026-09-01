/* eslint-env jest */

jest.mock('@react-native-async-storage/async-storage', () => {
  // The mock shipped by the package is ESM and is not transformed here, so the
  // suite uses a minimal in-memory store with the same contract.
  const store = new Map();

  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async key => (store.has(key) ? store.get(key) : null)),
      setItem: jest.fn(async (key, value) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async key => {
        store.delete(key);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const { Animated, Easing } = require('react-native');

  return {
    __esModule: true,
    default: Animated,
    Easing,
    ReduceMotion: { System: 'system' },
    cancelAnimation: () => undefined,
    useAnimatedStyle: updater => updater(),
    useAnimatedProps: updater => updater(),
    useDerivedValue: updater => ({ value: updater() }),
    useReducedMotion: () => false,
    useSharedValue: initialValue => ({ value: initialValue }),
    interpolateColor: (_value, _input, output) => output[output.length - 1],
    // The animation helpers all resolve to the value they animate towards, so
    // a test sees the finished state rather than a frame of the transition.
    withTiming: targetValue => targetValue,
    withSpring: targetValue => targetValue,
    withDelay: (_delay, animation) => animation,
    withSequence: (...animations) => animations[animations.length - 1],
    withRepeat: animation => animation,
    runOnJS: fn => fn,
    FadeIn: makeAnimationBuilder(),
    FadeOut: makeAnimationBuilder(),
    FadeInDown: makeAnimationBuilder(),
    SlideInDown: makeAnimationBuilder(),
    SlideOutDown: makeAnimationBuilder(),
    SlideOutLeft: makeAnimationBuilder(),
    LinearTransition: makeAnimationBuilder(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
  };

  function makeAnimationBuilder() {
    const builder = {
      delay: () => builder,
      duration: () => builder,
      easing: () => builder,
      reduceMotion: () => builder,
      springify: () => builder,
      damping: () => builder,
      stiffness: () => builder,
    };

    return builder;
  }
});

jest.mock('lottie-react-native', () => {
  // The native view is replaced by a plain View that keeps the props a test
  // asserts on (source, autoPlay, loop, progress, testID).
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: props => React.createElement(View, props),
  };
});

beforeEach(async () => {
  await require('@react-native-async-storage/async-storage').default.clear();
});
