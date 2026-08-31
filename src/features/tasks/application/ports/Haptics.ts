/**
 * The short physical answer to a tap.
 *
 * Completing something is the one moment in the app worth feeling, so this
 * port stays small on purpose: anything richer would end up buzzing at people
 * all day.
 */
export interface Haptics {
  /** A single task finished. */
  tap(): void;
  /** The whole trio finished. */
  celebrate(): void;
}
