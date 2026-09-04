/**
 * The three pages of the first-run walk-through, in order.
 *
 * Each page holds a cut-out of the product built in React Native — the real
 * components, held still — instead of a screenshot of it. Two reasons the
 * stills went away: a PNG captured on one device is the wrong width on every
 * other one, and a screen captured in Portuguese stayed Portuguese under
 * English words.
 *
 * The ground alternates Sol → Tinta → Sol. It is the walk-through's own floor,
 * not the theme's: these pages look the same whether the phone is set to light
 * or dark, because they are the same picture for everybody.
 */
import type { BrandGround } from '../../theme/brandGround';

export interface OnboardingStep {
  id: 'space' | 'day' | 'invite';
  ground: BrandGround;
}

export const onboardingSteps: readonly OnboardingStep[] = [
  { id: 'space', ground: 'sol' },
  { id: 'day', ground: 'tinta' },
  { id: 'invite', ground: 'sol' },
];
