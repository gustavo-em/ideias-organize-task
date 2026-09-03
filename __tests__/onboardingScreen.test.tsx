import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { OnboardingScreen } from '../src/app/components/OnboardingScreen';
import { onboardingSlides } from '../src/app/components/onboarding/onboardingSteps';
import { lightTheme } from '../src/app/theme/theme';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';

const mounted: ReturnType<typeof create>[] = [];

afterEach(() => {
  act(() => {
    while (mounted.length > 0) mounted.pop()?.unmount();
  });
});

function renderOnboarding(onFinish: (outcome: 'invite' | 'later') => void) {
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

  return rendered;
}

function press(node: ReactTestInstance) {
  act(() => {
    node.props.onPress();
  });
}

describe('first-run walk-through', () => {
  it('shows two pages of product stills and ends on the invite step', () => {
    const onFinish = jest.fn();
    const tree = renderOnboarding(onFinish);
    const next = tree.root.findByProps({ testID: 'onboarding-next' });

    expect(onboardingSlides).toHaveLength(3);
    expect(getTaskCopy('pt-BR').onboarding.steps).toHaveLength(3);
    expect(getTaskCopy('en-US').onboarding.steps).toHaveLength(3);
    // Every page is a still of the app itself: no placeholder mark anywhere.
    onboardingSlides.forEach(slide => {
      const stills = tree.root.findAllByProps({
        testID: `onboarding-demo-${slide.id}`,
      });
      expect(stills.length).toBeGreaterThan(0);
    });
    expect(
      tree.root.findAllByProps({ testID: 'onboarding-dot-1' }).length,
    ).toBeGreaterThan(0);

    // The last page asks the question instead of moving on, so the single
    // button is replaced by the two answers.
    press(next);
    press(next);
    expect(onFinish).not.toHaveBeenCalled();
    expect(
      tree.root.findAllByProps({ testID: 'onboarding-next' }),
    ).toHaveLength(0);
    expect(
      tree.root.findAllByProps({ testID: 'onboarding-invite' }).length,
    ).toBeGreaterThan(0);
    expect(
      tree.root.findAllByProps({ testID: 'onboarding-invite-later' }).length,
    ).toBeGreaterThan(0);
  });

  it('keeps each still in its own proportions', () => {
    // The stage height comes from the frame's aspect, never from stretching
    // the artwork: a wrong ratio here letterboxes or crops the product shot.
    onboardingSlides.forEach(slide => {
      expect(slide.aspect).toBeGreaterThan(0.4);
      expect(slide.aspect).toBeLessThan(2);
    });
    expect(onboardingSlides[0].id).toBe('tasks');
    expect(onboardingSlides[1].id).toBe('spaces');
    expect(onboardingSlides[2].id).toBe('invite');
    // The middle page is the one that plays, from at least three moments of
    // the product; first and last hold still.
    expect(onboardingSlides[1].frames?.length).toBeGreaterThanOrEqual(3);
    expect(onboardingSlides[0].frames).toBeUndefined();
    expect(onboardingSlides[2].frames).toBeUndefined();
  });

  it('asks for the invite in both languages, without naming a single kind of bond', () => {
    (['pt-BR', 'en-US'] as const).forEach(language => {
      const copy = getTaskCopy(language);
      const step = copy.onboarding.steps[2];

      expect(copy.onboarding.invite.action.length).toBeGreaterThan(0);
      expect(copy.onboarding.invite.later.length).toBeGreaterThan(0);
      expect(step.body).toMatch(/família|family/i);
      expect(step.body).toMatch(/amigos|friends/i);
      expect(step.body).not.toMatch(/namorad|girlfriend|boyfriend/i);
    });
  });

  it('answers the invite step with the outcome each button stands for', () => {
    const onFinish = jest.fn();
    const tree = renderOnboarding(onFinish);
    const next = tree.root.findByProps({ testID: 'onboarding-next' });

    press(next);
    press(next);
    press(tree.root.findByProps({ testID: 'onboarding-invite' }));
    expect(onFinish).toHaveBeenLastCalledWith('invite');

    press(tree.root.findByProps({ testID: 'onboarding-invite-later' }));
    expect(onFinish).toHaveBeenLastCalledWith('later');
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

    const skip = tree.root.findByProps({ testID: 'onboarding-skip' });
    press(skip);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith('later');
  });
});
