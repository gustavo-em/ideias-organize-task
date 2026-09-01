import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { OnboardingScreen } from '../src/app/components/OnboardingScreen';
import { onboardingScenes } from '../src/app/components/onboarding/onboardingSteps';
import { lightTheme } from '../src/app/theme/theme';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';

const reanimated = require('react-native-reanimated');

function renderOnboarding(onFinish: () => void) {
  let tree: ReturnType<typeof create> | null = null;

  act(() => {
    tree = create(
      <ThemeProvider theme={lightTheme}>
        <OnboardingScreen copy={getTaskCopy('pt-BR')} onFinish={onFinish} />
      </ThemeProvider>,
    );
  });

  return tree as unknown as ReturnType<typeof create>;
}

function press(node: ReactTestInstance) {
  act(() => {
    node.props.onPress();
  });
}

describe('first-run walk-through', () => {
  it('walks the four steps and only finishes on the last one', () => {
    const onFinish = jest.fn();
    const tree = renderOnboarding(onFinish);
    const next = tree.root.findByProps({ testID: 'onboarding-next' });

    expect(onboardingScenes).toHaveLength(4);
    expect(
      tree.root.findAllByProps({ testID: 'onboarding-scene-trio' }).length,
    ).toBeGreaterThan(0);

    press(next);
    press(next);
    press(next);
    expect(onFinish).not.toHaveBeenCalled();

    press(next);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('follows a swipe with the dots', () => {
    const tree = renderOnboarding(jest.fn());
    const pager = tree.root.findByProps({ testID: 'onboarding-pager' });

    act(() => {
      pager.props.onLayout({ nativeEvent: { layout: { width: 400 } } });
    });
    act(() => {
      pager.props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { x: 800 } },
      });
    });

    const dot = tree.root.findByProps({ testID: 'onboarding-dot-2' });
    expect(dot.props.$active).toBe(true);

    // Only the scene on screen keeps playing.
    const offscreen = tree.root.findByProps({
      testID: 'onboarding-scene-trio',
    });
    const onscreen = tree.root.findByProps({
      testID: 'onboarding-scene-shared',
    });
    expect(offscreen.props.autoPlay).toBe(false);
    expect(offscreen.props.progress).toBe(onboardingScenes[0].staticProgress);
    expect(onscreen.props.autoPlay).toBe(true);
  });

  it('leaves skip on screen at every step', () => {
    const onFinish = jest.fn();
    const tree = renderOnboarding(onFinish);

    press(tree.root.findByProps({ testID: 'onboarding-next' }));
    const skip = tree.root.findByProps({ testID: 'onboarding-skip' });
    press(skip);

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('freezes the scene when the device asks for less motion', () => {
    const spy = jest
      .spyOn(reanimated, 'useReducedMotion')
      .mockReturnValue(true);

    try {
      const tree = renderOnboarding(jest.fn());
      const scene = tree.root.findByProps({
        testID: 'onboarding-scene-trio',
      });

      expect(scene.props.autoPlay).toBe(false);
      expect(scene.props.loop).toBe(false);
      expect(scene.props.progress).toBe(onboardingScenes[0].staticProgress);
      // The stage keeps its height, so nothing under it moves.
      expect(scene.props.style.height).toBe(260);
    } finally {
      spy.mockRestore();
    }
  });
});
