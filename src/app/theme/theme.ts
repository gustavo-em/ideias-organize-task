export type AppearanceMode = 'light' | 'dark';

export const appearanceModes: readonly AppearanceMode[] = ['light', 'dark'];

interface ThemeColors {
  /** The brand yellow. It is a surface and a fill, never a text colour: at
   * 1.6:1 against paper it is unreadable as ink, and 11.4:1 as a ground. */
  accent: string;
  /** A warm graphite for small text and selected labels. The yellow remains a
   * surface and action colour instead of trying to act like ink. */
  accentInk: string;
  /** Mel: readable emphasis for text the quick-capture parser recognized. */
  recognizedText: string;
  /** Uva: the semantic accent for reminders and their next-alert feedback. */
  reminder: string;
  /** What is written on top of an accent fill. */
  onAccent: string;
  /** Support text on top of an accent fill. Ink at 78%: still readable at
   * label size, quiet enough to sit under the name it belongs to. */
  onAccentSubtle: string;
  /** A separator inside an accent band. Ink at 18%: a rule, not a border. */
  onAccentLine: string;
  background: string;
  card: string;
  cardElevated: string;
  /** A support surface with no yellow of its own: for pills and callouts that
   * sit near the accent and must not compete with it. */
  cardNeutral: string;
  /** The fill of a chip that carries a chosen value, and what is written on
   * it. A yellow fill made every set chip a second brand surface competing
   * with the one band that owns the colour; ink does the same job louder and
   * without borrowing the accent. Inverts in dark mode, where black on black
   * would be no chip at all. */
  selected: string;
  onSelected: string;
  border: string;
  borderSubtle: string;
  text: string;
  muted: string;
  mutedStrong: string;
  /** The focus screen's own ground. The colour change is the signal that the
   * phone left the list and entered the work — a warmer, more saturated
   * version of the current mode, never an inversion of it. A light phone that
   * turns black to run a timer reads as a different app. */
  focus: string;
  focusInk: string;
  onFocus: string;
  success: string;
  /** Ink for text that reports a gain. `success` is a fill: at 4.0:1 on the
   * new paper it fails AA at caption size, the same split `accent`/`accentInk`
   * already makes. */
  successInk: string;
  /** Project accents stay distinct from destructive red. */
  projectCoral: string;
  projectOcean: string;
  /**
   * Ink for text written on a project's own tint.
   *
   * The same split `accent`/`accentInk` and `success`/`successInk` already
   * make: an identity colour is a fill, not a tint for letters. Measured over
   * the tinted ground itself — the colour at 12% flattened on paper — the pure
   * accents land between 3.3:1 and 4.2:1 and fail AA at caption size, which is
   * exactly the size a group's date and count are written in.
   *
   * In dark mode the tone is already the light half of the pair, so the ink is
   * the token the theme uses for that colour's own ink and no new colour is
   * invented for the wash.
   */
  projectSunInk: string;
  projectGrapeInk: string;
  projectMintInk: string;
  projectCoralInk: string;
  projectOceanInk: string;
  danger: string;
  /** Backdrop behind the capture sheet and the celebration. */
  scrim: string;
}

export interface AppTheme {
  mode: AppearanceMode;
  colors: ThemeColors;
  radii: {
    small: number;
    medium: number;
    large: number;
    extraLarge: number;
    pill: number;
  };
  spacing: {
    tiny: number;
    small: number;
    medium: number;
    large: number;
    extraLarge: number;
  };
  /** Type sizes, named after their job rather than their size, so a screen
   * never picks a number that means nothing. */
  type: {
    display: number;
    title: number;
    heading: number;
    body: number;
    label: number;
    caption: number;
  };
}

const sharedTheme = {
  radii: {
    small: 10,
    medium: 15,
    large: 20,
    extraLarge: 28,
    pill: 999,
  },
  spacing: {
    tiny: 4,
    small: 8,
    medium: 16,
    large: 24,
    extraLarge: 32,
  },
  type: {
    display: 34,
    title: 25,
    heading: 19,
    body: 15,
    label: 13,
    caption: 11,
  },
} as const;

export const lightTheme: AppTheme = {
  ...sharedTheme,
  mode: 'light',
  colors: {
    accent: '#FFC63D',
    accentInk: '#40392A',
    recognizedText: '#B36F00',
    reminder: '#4B3A8F',
    onAccent: '#1B1710',
    onAccentSubtle: 'rgba(27, 23, 16, 0.78)',
    onAccentLine: 'rgba(27, 23, 16, 0.18)',
    // Light grey paper, a clear step down from white and with no yellow of its
    // own. A card only reads as a card when the sheet under it is not the same
    // colour as the card, and a neutral ground lets the accent be the only
    // yellow on the screen.
    background: '#F4F4F5',
    card: '#FFFFFF',
    // A butter yellow for selected and support surfaces: unmistakably the
    // brand's yellow, a step lighter than the accent so the primary action
    // still owns the strongest fill. The paler cream it replaced read as
    // stained paper next to the grey ground.
    cardElevated: '#FFE08A',
    cardNeutral: '#EDEAE3',
    selected: '#1B1710',
    onSelected: '#FFFFFF',
    border: '#E3E1DB',
    // With card shadows gone, this line is the only separation left between
    // rows, so it has to be visible on the new paper.
    borderSubtle: '#ECEAE4',
    text: '#1B1710',
    muted: '#6F6656',
    mutedStrong: '#5E5545',
    focus: '#FFEFCB',
    focusInk: '#FF9A44',
    onFocus: '#1B1710',
    success: '#0A8F60',
    successInk: '#077A52',
    projectCoral: '#B8653C',
    projectOcean: '#167B84',
    // Contrast measured on each colour's own tint over `background`:
    // 5.4, 5.4, 5.2, 5.3 and 5.2 to one.
    projectSunInk: '#855700',
    projectGrapeInk: '#8F4E19',
    projectMintInk: '#066A47',
    projectCoralInk: '#8A4A26',
    projectOceanInk: '#0B4A50',
    danger: '#C93B25',
    scrim: 'rgba(27, 23, 16, 0.42)',
  },
};

export const darkTheme: AppTheme = {
  ...sharedTheme,
  mode: 'dark',
  colors: {
    accent: '#FFC63D',
    accentInk: '#FFB524',
    recognizedText: '#FFB524',
    reminder: '#A895F5',
    onAccent: '#1B1710',
    // `accent` does not change between modes, so what is written on it does
    // not change either.
    onAccentSubtle: 'rgba(27, 23, 16, 0.78)',
    onAccentLine: 'rgba(27, 23, 16, 0.18)',
    // A warm near-black. A neutral grey next to this yellow reads as a
    // different product; the ground keeps the same temperature as the brand.
    background: '#141008',
    card: '#1E1810',
    cardElevated: '#4A3A12',
    cardNeutral: '#272319',
    selected: '#FBF3E1',
    onSelected: '#141008',
    border: '#3A3122',
    borderSubtle: '#2A2317',
    text: '#FBF3E1',
    muted: '#94886F',
    mutedStrong: '#C4B79C',
    focus: '#0F0B05',
    focusInk: '#FFB870',
    onFocus: '#FBF3E1',
    success: '#3FD69B',
    successInk: '#3FD69B',
    projectCoral: '#F29A72',
    projectOcean: '#5FC7CE',
    // The tone is already light here, so each ink is the token that colour
    // writes with everywhere else in the dark theme.
    projectSunInk: '#FFB524',
    projectGrapeInk: '#FFB870',
    projectMintInk: '#3FD69B',
    projectCoralInk: '#F29A72',
    projectOceanInk: '#5FC7CE',
    danger: '#FF8A73',
    scrim: 'rgba(6, 4, 0, 0.62)',
  },
};

export function getAppTheme(mode: AppearanceMode): AppTheme {
  return mode === 'dark' ? darkTheme : lightTheme;
}

export const appTheme = lightTheme;
