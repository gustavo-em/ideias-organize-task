/**
 * The two pages of the first-run walk-through, in order.
 *
 * Each page holds a single still — a real screenshot of this app, captured on
 * a device — so what the walk-through shows is the product itself and not an
 * illustration of it. The first still is the task list with the day's card;
 * the second is the invite sheet of a shared space, link ready to send.
 */
import type { ImageSourcePropType } from 'react-native';

export interface OnboardingSlide {
  id: 'tasks' | 'invite';
  /** Width over height of the still, so the stage takes the frame's own
   * proportions instead of leaving a letterbox under it. */
  aspect: number;
  still: ImageSourcePropType;
}

export const onboardingSlides: readonly OnboardingSlide[] = [
  {
    id: 'tasks',
    aspect: 1080 / 1704,
    still: require('../../../../assets/onboarding/step-tarefas.png'),
  },
  {
    id: 'invite',
    aspect: 1080 / 830,
    still: require('../../../../assets/onboarding/step-convite.png'),
  },
];
