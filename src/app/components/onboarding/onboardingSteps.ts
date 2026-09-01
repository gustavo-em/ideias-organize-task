/**
 * The four scenes of the first-run walk-through, in order.
 *
 * The animations are authored in this repository and required statically, so
 * the app never waits on the network to explain itself, and the order here is
 * the same order the copy uses: one concept per step.
 */
import type { AnimationObject } from 'lottie-react-native';

export interface OnboardingStepScene {
  id: 'trio' | 'progress' | 'shared' | 'focus';
  /** The Lottie source, resolved by Metro at build time. */
  source: AnimationObject;
  /** The frame shown when the device asks for less motion: a moment of the
   * scene that already reads as the finished idea. */
  staticProgress: number;
}

export const onboardingScenes: readonly OnboardingStepScene[] = [
  {
    id: 'trio',
    source: require('../../../../assets/lottie/trio.json'),
    staticProgress: 0.6,
  },
  {
    id: 'progress',
    source: require('../../../../assets/lottie/progress.json'),
    staticProgress: 0.6,
  },
  {
    id: 'shared',
    source: require('../../../../assets/lottie/shared.json'),
    staticProgress: 0.6,
  },
  {
    id: 'focus',
    source: require('../../../../assets/lottie/focus.json'),
    staticProgress: 0.6,
  },
];
