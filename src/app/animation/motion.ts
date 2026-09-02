import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  SlideInDown,
  SlideOutDown,
  SlideOutLeft,
} from 'react-native-reanimated';

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

/** The top of a screen arriving: eyebrow and title before anything else. */
export const SCREEN_ENTER = {
  duration: 280,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** A block of content settling under the header. */
export const CONTENT_ENTER = {
  duration: 240,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** A single row or card joining a list. */
export const ROW_ENTER = {
  duration: 280,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** Leaving is always quicker than arriving: nothing holds the screen. */
export const EXIT = {
  duration: 240,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/** The dimmed ground behind a sheet. */
export const SCRIM_IN = {
  duration: 160,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/** Every scrim leaves in 140ms. The profile sheet used to take 200; it was
 * the only one, and it was aligned down rather than kept as an exception. */
export const SCRIM_OUT = {
  duration: 140,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/** A whole surface dropping away. */
export const SHEET_EXIT = {
  duration: 180,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/** The spring the sheets already open with; measured, so it is not retuned. */
export const SHEET_ENTER_SPRING = {
  damping: 20,
  stiffness: 200,
  reduceMotion: ReduceMotion.System,
} as const;

/** The dialog's own measured spring, kept exactly as it was: it has always
 * been a little tighter than the sheets, and this is not a new choice. */
export const DIALOG_ENTER_SPRING = {
  damping: 20,
  stiffness: 220,
  reduceMotion: ReduceMotion.System,
} as const;

/** The focus ring breathing while a session runs. One half of a slow cycle,
 * so it is not an entrance and does not sit in the entrance band. */
export const BREATH = {
  duration: 1500,
  easing: Easing.inOut(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/** How far the ring swells on each breath. */
export const BREATH_SCALE = 1.02;

/** A switch flipping: the thumb crosses its track. Shorter than a disclosure
 * because a single control is moving, not a section. */
export const TOGGLE = {
  duration: 140,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/** The clock label ticking over to a new second. */
export const BUMP = {
  duration: 180,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/** How far the label lifts before settling back. */
export const BUMP_SCALE = 1.05;

/** Confetti flight. Not an entrance: a piece thrown across the screen has to
 * outlive the surface it congratulates, so it sits outside the entrance band. */
export const ACHIEVEMENT_CONFETTI = {
  duration: 620,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

export const CELEBRATION_CONFETTI = {
  duration: 1200,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** The gap between confetti pieces leaving, so they scatter instead of
 * marching. */
export const ACHIEVEMENT_CONFETTI_STAGGER_MS = 30;
export const CELEBRATION_CONFETTI_STAGGER_MS = 40;

/** How long each extra row waits before entering, so a list arrives as a
 * sequence rather than a block. */
export const STAGGER_MS = 45;

/** Past this many rows the wait stops growing: a long list must not animate
 * late just because it is long. */
export const MAX_STAGGER_STEPS = 6;

/** The gap between blocks of a screen, and how many of them are staggered
 * before the rest arrive together. */
export const SECTION_DELAY_MS = 60;
export const MAX_SECTION_STEPS = 3;

export function staggerDelay(index: number): number {
  return Math.min(Math.max(index, 0), MAX_STAGGER_STEPS) * STAGGER_MS;
}

export function sectionDelay(step: number): number {
  return Math.min(Math.max(step, 0), MAX_SECTION_STEPS) * SECTION_DELAY_MS;
}

/**
 * The builders below are the only way a screen states an animation: every one
 * of them carries `ReduceMotion.System`, so a phone asking for less movement
 * gets the final frame straight away, everywhere, without a screen checking.
 */

/** The header of a screen. Runs before any content block. */
export function screenEnter() {
  return FadeInDown.duration(SCREEN_ENTER.duration)
    .easing(SCREEN_ENTER.easing)
    .reduceMotion(ReduceMotion.System);
}

/** A content block, `step` places down the screen from the header. */
export function contentEnter(step = 0) {
  return FadeInDown.delay(sectionDelay(step))
    .duration(CONTENT_ENTER.duration)
    .easing(CONTENT_ENTER.easing)
    .reduceMotion(ReduceMotion.System);
}

/** A row or card at `index` in a list. */
export function rowEnter(index: number) {
  return FadeInDown.delay(staggerDelay(index))
    .duration(ROW_ENTER.duration)
    .easing(ROW_ENTER.easing)
    .reduceMotion(ReduceMotion.System);
}

/** A row leaving the list sideways, out of the way of the ones staying. */
export function rowExit() {
  return SlideOutLeft.duration(EXIT.duration).reduceMotion(ReduceMotion.System);
}

/** Rows closing the gap left by a row that went away. Mass stays at the
 * layout default: a layout transition takes damping and stiffness only. */
export const ROW_LAYOUT_SPRING = {
  damping: 20,
  stiffness: 200,
  reduceMotion: ReduceMotion.System,
} as const;

export function rowLayout() {
  return LinearTransition.springify()
    .damping(ROW_LAYOUT_SPRING.damping)
    .stiffness(ROW_LAYOUT_SPRING.stiffness)
    .reduceMotion(ReduceMotion.System);
}

/** A section growing or shrinking as it opens and closes. */
export function sectionLayout() {
  return LinearTransition.duration(DISCLOSURE.duration)
    .easing(DISCLOSURE.easing)
    .reduceMotion(ReduceMotion.System);
}

/** A whole screen body arriving in place, without moving. Used where the
 * block owns the layout of what is inside it and a vertical entrance would
 * measure its children mid-flight. */
export function contentFadeEnter() {
  return FadeIn.duration(CONTENT_ENTER.duration)
    .easing(CONTENT_ENTER.easing)
    .reduceMotion(ReduceMotion.System);
}

/** A block fading in or out in place, without moving. */
export function fadeEnter() {
  return FadeIn.duration(FADE.duration)
    .easing(FADE.easing)
    .reduceMotion(ReduceMotion.System);
}

export function fadeExit() {
  return FadeOut.duration(FADE.duration)
    .easing(FADE.easing)
    .reduceMotion(ReduceMotion.System);
}

/** A section opening under its header. */
export function disclosureEnter() {
  return FadeIn.duration(DISCLOSURE.duration)
    .easing(DISCLOSURE.easing)
    .reduceMotion(ReduceMotion.System);
}

export function scrimEnter() {
  return FadeIn.duration(SCRIM_IN.duration).reduceMotion(ReduceMotion.System);
}

export function scrimExit() {
  return FadeOut.duration(SCRIM_OUT.duration).reduceMotion(ReduceMotion.System);
}

/** A sheet arriving on its spring. */
export function sheetEnter() {
  return SlideInDown.springify()
    .damping(SHEET_ENTER_SPRING.damping)
    .stiffness(SHEET_ENTER_SPRING.stiffness)
    .reduceMotion(ReduceMotion.System);
}

/** The capture sheet, which is timed rather than sprung: its opening is the
 * one measured by the performance trace. */
export function sheetSlideEnter() {
  return SlideInDown.duration(SLIDE.duration)
    .easing(SLIDE.easing)
    .reduceMotion(ReduceMotion.System);
}

/** A confirmation dialog arriving. */
export function dialogEnter() {
  return SlideInDown.springify()
    .damping(DIALOG_ENTER_SPRING.damping)
    .stiffness(DIALOG_ENTER_SPRING.stiffness)
    .reduceMotion(ReduceMotion.System);
}

export function sheetExit() {
  return SlideOutDown.duration(SHEET_EXIT.duration).reduceMotion(
    ReduceMotion.System,
  );
}
