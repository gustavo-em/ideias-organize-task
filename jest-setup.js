/* eslint-env jest */

jest.mock('@react-native-async-storage/async-storage', () => {
  // The mock shipped by the package is ESM and is not transformed here, so the
  // suite uses a minimal in-memory store with the same contract.
  const store = new Map();

  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async key => (store.has(key) ? store.get(key) : null)),
      getAllKeys: jest.fn(async () => [...store.keys()]),
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

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  AndroidImportance: { DEFAULT: 3 },
  AuthorizationStatus: { DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 },
  default: {
    createChannel: jest.fn(async () => 'project-activity'),
    displayNotification: jest.fn(async () => undefined),
    getNotificationSettings: jest.fn(async () => ({ authorizationStatus: 1 })),
    openNotificationSettings: jest.fn(async () => undefined),
    requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
  },
}));

jest.mock('react-native-background-fetch', () => ({
  __esModule: true,
  default: {
    NETWORK_TYPE_ANY: 0,
    configure: jest.fn(async () => 2),
    finish: jest.fn(),
    registerHeadlessTask: jest.fn(),
  },
}));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => 'test-token'),
  onMessage: jest.fn(() => () => undefined),
  onTokenRefresh: jest.fn(() => () => undefined),
  setBackgroundMessageHandler: jest.fn(),
}));

// The gallery is a native screen: the suite only ever needs the shape of the
// answer, and each test that cares sets its own result.
jest.mock('react-native-image-picker', () => ({
  __esModule: true,
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
}));

beforeEach(async () => {
  await require('@react-native-async-storage/async-storage').default.clear();
});
