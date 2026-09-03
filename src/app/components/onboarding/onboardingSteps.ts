/**
 * The two pages of the first-run walk-through, in order.
 *
 * Each page holds a single still — a real screenshot of this app, captured on
 * a device — so what the walk-through shows is the product itself and not an
 * illustration of it. The task list with the day's card; then a shared space
 * living its day — the spaces page loops through three moments of a
 * "Churras de sábado"; then the invite sheet, link ready to send.
 */
import type { ImageSourcePropType } from 'react-native';

export interface OnboardingSlide {
  id: 'couple' | 'tasks' | 'spaces' | 'invite';
  /** Width over height of the artwork, so the stage takes the frame's own
   * proportions instead of leaving a letterbox under it. */
  aspect: number;
  still: ImageSourcePropType;
  /** Present on the page that plays: a quiet loop of stills of the product,
   * starting on `still`. */
  frames?: readonly ImageSourcePropType[];
}

export const onboardingSlides: readonly OnboardingSlide[] = [
  {
    id: 'couple',
    aspect: 1080 / 2127,
    still: require('../../../../assets/onboarding/couple-01.png'),
    frames: [
      require('../../../../assets/onboarding/couple-01.png'),
      require('../../../../assets/onboarding/couple-02.png'),
      require('../../../../assets/onboarding/couple-03.png'),
    ],
  },
  {
    id: 'tasks',
    aspect: 1080 / 2127,
    still: require('../../../../assets/onboarding/step-tarefas.png'),
  },
  {
    id: 'spaces',
    aspect: 1080 / 2127,
    still: require('../../../../assets/onboarding/spaces-01.png'),
    frames: [
      require('../../../../assets/onboarding/spaces-01.png'),
      require('../../../../assets/onboarding/spaces-02.png'),
      require('../../../../assets/onboarding/spaces-03.png'),
    ],
  },
  {
    id: 'invite',
    aspect: 1080 / 2127,
    still: require('../../../../assets/onboarding/step-convite.png'),
  },
];
