import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { OnboardingScreen } from '../src/app/components/OnboardingScreen';
import { onboardingDemos } from '../src/app/components/onboarding/onboardingSteps';
import { lightTheme } from '../src/app/theme/theme';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';

const reanimated = require('react-native-reanimated');

const mounted: ReturnType<typeof create>[] = [];

afterEach(() => {
  // The demos loop for as long as they are on screen: leaving one mounted would
  // keep animating after the test ended.
  act(() => {
    while (mounted.length > 0) mounted.pop()?.unmount();
  });
});

function renderOnboarding(onFinish: () => void) {
  let tree: ReturnType<typeof create> | null = null;

  act(() => {
    tree = create(
      <ThemeProvider theme={lightTheme}>
        <OnboardingScreen copy={getTaskCopy('pt-BR')} onFinish={onFinish} />
      </ThemeProvider>,
    );
  });

  const rendered = tree as unknown as ReturnType<typeof create>;
  mounted.push(rendered);

  // The ring only knows where the button is after the stage is measured, so the
  // tests measure it the way the device would.
  act(() => {
    onboardingDemos.forEach(demo => {
      rendered.root
        .findAllByProps({ testID: `onboarding-demo-${demo.id}` })
        .forEach(stage => {
          stage.props.onLayout?.({ nativeEvent: { layout: { width: 360 } } });
        });
    });
  });

  return rendered;
}

function press(node: ReactTestInstance) {
  act(() => {
    node.props.onPress();
  });
}

describe('first-run walk-through', () => {
  it('walks the two demos and only finishes on the last one', () => {
    const onFinish = jest.fn();
    const tree = renderOnboarding(onFinish);
    const next = tree.root.findByProps({ testID: 'onboarding-next' });

    expect(onboardingDemos).toHaveLength(2);
    expect(getTaskCopy('pt-BR').onboarding.steps).toHaveLength(2);
    expect(getTaskCopy('en-US').onboarding.steps).toHaveLength(2);
    expect(
      tree.root.findAllByProps({ testID: 'onboarding-demo-capture' }).length,
    ).toBeGreaterThan(0);
    expect(
      tree.root.findAllByProps({ testID: 'onboarding-demo-shared' }).length,
    ).toBeGreaterThan(0);

    press(next);
    expect(onFinish).not.toHaveBeenCalled();

    press(next);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('plays every demo from real screenshots, with a ring on the tapped button', () => {
    const tree = renderOnboarding(jest.fn());

    onboardingDemos.forEach(demo => {
      const rings = demo.frames.filter(frame => frame.tap !== undefined);
      expect(demo.frames.length).toBeGreaterThanOrEqual(6);
      expect(demo.frames.length).toBeLessThanOrEqual(10);
      expect(rings.length).toBeGreaterThanOrEqual(3);

      demo.frames.forEach((frame, index) => {
        expect(
          tree.root.findAllByProps({
            testID: `onboarding-frame-${demo.id}-${index}`,
          }).length,
        ).toBeGreaterThan(0);

        if (frame.tap !== undefined) {
          expect(
            tree.root.findAllByProps({
              testID: `onboarding-tap-${demo.id}-${index}`,
            }).length,
          ).toBeGreaterThan(0);
        }
      });
    });
  });

  it('follows a swipe with the dots', () => {
    const tree = renderOnboarding(jest.fn());
    const pager = tree.root.findByProps({ testID: 'onboarding-pager' });

    act(() => {
      pager.props.onLayout({ nativeEvent: { layout: { width: 400 } } });
    });
    act(() => {
      pager.props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { x: 400 } },
      });
    });

    const dot = tree.root.findByProps({ testID: 'onboarding-dot-1' });
    expect(dot.props.$active).toBe(true);
  });

  it('leaves skip on screen at every step', () => {
    const onFinish = jest.fn();
    const tree = renderOnboarding(onFinish);

    press(tree.root.findByProps({ testID: 'onboarding-next' }));
    const skip = tree.root.findByProps({ testID: 'onboarding-skip' });
    press(skip);

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('freezes the demo on its first frame when the device asks for less motion', () => {
    const spy = jest
      .spyOn(reanimated, 'useReducedMotion')
      .mockReturnValue(true);

    try {
      const tree = renderOnboarding(jest.fn());
      const stillStage = tree.root.findByProps({
        testID: 'onboarding-demo-capture',
      });
      // The stage keeps its height, so the words under it never move.
      const still = stillStage.props.style.height;

      spy.mockReturnValue(false);
      const moving = renderOnboarding(jest.fn()).root.findByProps({
        testID: 'onboarding-demo-capture',
      }).props.style.height;

      expect(still).toBe(moving);
      expect(still).toBeGreaterThanOrEqual(280);
      expect(still).toBeLessThanOrEqual(380);

      // The ring of the first frame stays on screen, without the pulse.
      expect(
        tree.root.findAllByProps({ testID: 'onboarding-tap-capture-0' }).length,
      ).toBeGreaterThan(0);
    } finally {
      spy.mockRestore();
    }
  });
});
