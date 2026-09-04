/**
 * The two brand grounds, and the colours that live on them.
 *
 * Onboarding and the entrance screen are brand surfaces: their floor is Sol or
 * Tinta whatever the phone's appearance is set to, because the walk-through is
 * the same picture for everybody. So these are literals, not theme tokens —
 * `theme.colors.card` turns near-black in dark mode, and the cut-out of the
 * product has to stay the light UI it is a picture of.
 *
 * `accent` and `onAccent` in the theme already hold Sol and Tinta and do not
 * change between modes; the rest of what these screens draw does, which is why
 * it is written down here instead.
 */
export const brandGround = {
  /** The yellow floor. Same value as `theme.colors.accent`. */
  sol: '#FFC63D',
  /** The near-black floor. Same value as `theme.colors.onAccent`. */
  tinta: '#1B1710',

  /** Ink written on Sol, and the two weights under it. */
  onSol: '#1B1710',
  onSolSubtle: 'rgba(27, 23, 16, 0.78)',
  onSolMuted: 'rgba(27, 23, 16, 0.7)',
  onSolFaint: 'rgba(27, 23, 16, 0.6)',
  onSolLine: 'rgba(27, 23, 16, 0.35)',
  onSolDim: 'rgba(27, 23, 16, 0.3)',

  /** Ink written on Tinta. */
  onTinta: '#FBF3E1',
  onTintaSubtle: '#C4B79C',
  onTintaDim: 'rgba(251, 243, 225, 0.3)',
  onTintaFill: 'rgba(251, 243, 225, 0.1)',

  /** Inside the cut-out: the app's light UI, held still. */
  paper: '#F4F3EF',
  card: '#FFFFFF',
  cardInk: '#1B1710',
  cardMuted: '#6F6656',
  cardLine: '#ECEAE4',
  cardBorder: '#E3E1DB',
  cardNeutral: '#EDEAE3',

  /** Member tones and the focus colour, matching the app's own palette. */
  focusInk: '#4B3A8F',
  memberCoral: '#B8653C',
  memberOcean: '#167B84',

  /** The eyebrow above each step in the spec, and on the entrance screen. */
  eyebrow: '#8A7F6D',
} as const;

export type BrandGround = 'sol' | 'tinta';
