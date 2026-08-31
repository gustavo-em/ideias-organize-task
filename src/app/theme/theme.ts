export type AppearanceMode = 'light' | 'dark';

export const appearanceModes: readonly AppearanceMode[] = ['light', 'dark'];

interface ThemeColors {
  /** The brand yellow. It is a surface and a fill, never a text colour: at
   * 1.6:1 against paper it is unreadable as ink, and 11.4:1 as a ground. */
  accent: string;
  /** A warm graphite for small text and selected labels. The yellow remains a
   * surface and action colour instead of trying to act like ink. */
  accentInk: string;
  /** What is written on top of an accent fill. */
  onAccent: string;
  background: string;
  card: string;
  cardElevated: string;
  border: string;
  borderSubtle: string;
  text: string;
  muted: string;
  mutedStrong: string;
  /** The focus screen's own ground. The colour change is the signal that the
   * phone left the list and entered the work. */
  focus: string;
  focusInk: string;
  onFocus: string;
  success: string;
  /** Project accents stay distinct from destructive red. */
  projectCoral: string;
  projectOcean: string;
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
    onAccent: '#1B1710',
    // A near-white yellow paper. It keeps the interface warm without making
    // the canvas compete with the work itself.
    background: '#FFFDF7',
    card: '#FFFFFF',
    // The middle of the yellow scale: visibly alive on selected and support
    // surfaces, while the accent keeps ownership of the primary action.
    cardElevated: '#FFE6A0',
    border: '#E9DDC2',
    borderSubtle: '#F3EBD8',
    text: '#1B1710',
    muted: '#8A7F6D',
    mutedStrong: '#5E5545',
    focus: '#3A2C74',
    focusInk: '#4B3A8F',
    onFocus: '#F2EEFF',
    success: '#0A8F60',
    projectCoral: '#B8653C',
    projectOcean: '#167B84',
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
    onAccent: '#1B1710',
    // A warm near-black. A neutral grey next to this yellow reads as a
    // different product; the ground keeps the same temperature as the brand.
    background: '#141008',
    card: '#1E1810',
    cardElevated: '#2A2216',
    border: '#3A3122',
    borderSubtle: '#2A2317',
    text: '#FBF3E1',
    muted: '#94886F',
    mutedStrong: '#C4B79C',
    focus: '#2A1F58',
    focusInk: '#A895F5',
    onFocus: '#F2EEFF',
    success: '#3FD69B',
    projectCoral: '#F29A72',
    projectOcean: '#5FC7CE',
    danger: '#FF8A73',
    scrim: 'rgba(6, 4, 0, 0.62)',
  },
};

export function getAppTheme(mode: AppearanceMode): AppTheme {
  return mode === 'dark' ? darkTheme : lightTheme;
}

export const appTheme = lightTheme;
