/**
 * The two demos of the first-run walk-through, in order.
 *
 * Every frame is a screenshot of this app taken on a device by
 * `scripts/capture-onboarding-frames.sh`, so what the walk-through shows is the
 * product itself and not an illustration of it. The tap coordinates come from
 * the same run — they are normalised to the cropped frame — and the ring is
 * drawn by the app over the button that was pressed.
 */
import type { ImageSourcePropType } from 'react-native';

export interface OnboardingTap {
  /** Horizontal position of the pressed button, 0–1 inside the frame. */
  x: number;
  /** Vertical position of the pressed button, 0–1 inside the frame. */
  y: number;
  /** Diameter in dp, for the few targets whose label sits right next to the
   * icon: a smaller ring is what keeps the words readable. Defaults to 56. */
  size?: number;
}

export interface OnboardingFrame {
  source: ImageSourcePropType;
  /** Present when this step of the flow is a tap the user has to see. */
  tap?: OnboardingTap;
}

export interface OnboardingDemo {
  id: 'capture' | 'shared';
  /** Width over height of this demo's frames, so the ring stays on the button
   * no matter how tall the stage is. Each slide is cropped to its own band of
   * the screen. */
  aspect: number;
  frames: readonly OnboardingFrame[];
}

/** How long each frame is held before the next one fades in. */
export const FRAME_HOLD_MS = 900;

/** The crossfade between two frames. Short on purpose: while it runs, the text
 * of both screenshots is on screen at once, and that is the one moment where
 * the app looks unreadable. */
export const FRAME_FADE_MS = 140;

/** The screenshots in `assets/onboarding/` were captured before the Aluza
 * rebrand: they still show the old name and the word "Projetos", which the
 * interface no longer uses. While this is true the walk-through shows the
 * brand mark instead of the stale frames — teaching a name the app dropped is
 * worse than showing no demo. Recapture with
 * `scripts/capture-onboarding-frames.sh` (see docs/brand/release-checklist.md)
 * and flip this to `false` in the same commit as the new PNGs. */
export const ONBOARDING_FRAMES_STALE = true;

export const onboardingDemos: readonly OnboardingDemo[] = [
  {
    id: 'capture',
    aspect: 1080 / 1150,
    frames: [
      {
        source: require('../../../../assets/onboarding/capture-01.png'),
        tap: { x: 0.575, y: 0.8704 },
      },
      {
        source: require('../../../../assets/onboarding/capture-02.png'),
        tap: { x: 0.78, y: 0.4165 },
      },
      { source: require('../../../../assets/onboarding/capture-03.png') },
      {
        source: require('../../../../assets/onboarding/capture-04.png'),
        tap: { size: 40, x: 0.064, y: 0.6948 },
      },
      {
        source: require('../../../../assets/onboarding/capture-05.png'),
        tap: { x: 0.152, y: 0.4609 },
      },
      {
        source: require('../../../../assets/onboarding/capture-06.png'),
        tap: { size: 40, x: 0.3875, y: 0.08 },
      },
      {
        source: require('../../../../assets/onboarding/capture-07.png'),
        tap: { size: 40, x: 0.639, y: 0.3052 },
      },
      { source: require('../../../../assets/onboarding/capture-08.png') },
    ],
  },
  {
    id: 'shared',
    aspect: 1080 / 780,
    frames: [
      {
        source: require('../../../../assets/onboarding/shared-01.png'),
        tap: { x: 0.8417, y: 0.0871 },
      },
      {
        source: require('../../../../assets/onboarding/shared-02.png'),
        tap: { x: 0.6157, y: 0.0859 },
      },
      {
        source: require('../../../../assets/onboarding/shared-03.png'),
        tap: { x: 0.74, y: 0.854 },
      },
      { source: require('../../../../assets/onboarding/shared-04.png') },
      { source: require('../../../../assets/onboarding/shared-05.png') },
      { source: require('../../../../assets/onboarding/shared-06.png') },
    ],
  },
];
