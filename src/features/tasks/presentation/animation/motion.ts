import { Easing, ReduceMotion } from 'react-native-reanimated';

/**
 * The app's whole motion vocabulary, in one file.
 *
 * Every animation in the product is built from these; a screen that invents
 * its own duration is how an interface starts feeling assembled by different
 * people. `ReduceMotion.System` is set on all of them, so a phone asking for
 * less movement gets it without a single screen having to check.
 */

/** A tap answering under the finger. Quick, barely visible, always there. */
export const PRESS_SPRING = {
  damping: 18,
  stiffness: 320,
  mass: 0.6,
  reduceMotion: ReduceMotion.System,
} as const;

/** Ticking a task. Loose enough to overshoot a little: the box should feel
 * like it snapped shut. */
export const CHECK_SPRING = {
  damping: 14,
  stiffness: 220,
  mass: 0.7,
  reduceMotion: ReduceMotion.System,
} as const;

/** The capture sheet arriving, and the celebration. Heavier: a whole surface
 * is moving, not a control. */
export const SHEET_SPRING = {
  damping: 20,
  stiffness: 190,
  mass: 0.9,
  reduceMotion: ReduceMotion.System,
} as const;

/** The launch mark turning from a list into a tick. */
export const MARK_SPRING = {
  damping: 15,
  stiffness: 140,
  mass: 1,
  reduceMotion: ReduceMotion.System,
} as const;

export const FADE = {
  duration: 180,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/** Opening a section: quick enough to preserve scanning continuity. */
export const DISCLOSURE = {
  duration: 160,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

export const SLIDE = {
  duration: 260,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** Numbers rolling up to a new total. */
export const COUNT = {
  duration: 600,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** Colour crossing from the list ground to the focus ground. */
export const GROUND = {
  duration: 420,
  easing: Easing.inOut(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/** How long each extra row waits before entering, so a list arrives as a
 * sequence rather than a block. */
export const STAGGER_MS = 45;
