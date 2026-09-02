import { darkTheme, lightTheme } from '../src/app/theme/theme';
import { MARK_ASPECT, MARK_COLORS } from '../src/app/components/AppMark';
import { SPLASH_TIMING } from '../src/app/components/AppSplash';
import { WORDMARK_RATIO } from '../src/app/components/AppWordmark';
import { APP_NAME } from '../src/app/config/appMetadata';

describe('brand contract', () => {
  it('carries the Aluza name', () => {
    expect(APP_NAME).toBe('Aluza');
  });

  it('keeps the board artwork in its own proportions', () => {
    // The symbol is a bitmap cut from the brand board: any size is a uniform
    // scale of this aspect, so no dimension is ever set on its own.
    expect(MARK_ASPECT).toBeGreaterThan(0.9);
    expect(MARK_ASPECT).toBeLessThan(1.1);
    // Width follows the artwork's ratio: the letters are never stretched.
    expect(WORDMARK_RATIO).toBeGreaterThan(1.8);
    expect(WORDMARK_RATIO).toBeLessThan(3.2);
  });

  it('keeps the kit palette and the launch timing bounds', () => {
    expect(MARK_COLORS).toMatchObject({
      ink: '#1D1D1B',
      sun: '#FFC107',
      cream: '#F6F3EC',
      white: '#FFFFFF',
    });
    expect(SPLASH_TIMING).toEqual({
      mark: 320,
      settle: 520,
      draw: 620,
      sunDelay: 640,
      sun: 220,
      wordmark: 260,
      wordmarkDelay: 900,
      minVisible: 1250,
      fade: 180,
      compact: 120,
      reducedFade: 80,
      slowState: 1500,
    });
    // The whole sequence has to be over before the floor that holds it on
    // screen, so the mark is never cut mid-sequence.
    expect(
      SPLASH_TIMING.wordmarkDelay + SPLASH_TIMING.wordmark,
    ).toBeLessThanOrEqual(SPLASH_TIMING.minVisible);
    // The stroke finishes drawing before the sun lights over it.
    expect(SPLASH_TIMING.draw).toBeLessThanOrEqual(SPLASH_TIMING.sunDelay);
    // The sun lights up before the wordmark answers it.
    expect(SPLASH_TIMING.sunDelay + SPLASH_TIMING.sun).toBeLessThanOrEqual(
      SPLASH_TIMING.wordmarkDelay,
    );
    // The opening, floor and exit together stay inside the 1.2s–1.6s band.
    const opening = SPLASH_TIMING.minVisible + SPLASH_TIMING.fade;
    expect(opening).toBeGreaterThanOrEqual(1200);
    expect(opening).toBeLessThanOrEqual(1600);
    // Ready before the floor means a shorter exit, never a longer one.
    expect(SPLASH_TIMING.compact).toBeLessThan(SPLASH_TIMING.fade);
  });

  it('writes the same ink on Sol in both modes', () => {
    // `accent` does not change between light and dark, so neither does what
    // is written on top of it — the shared day band reads the same in both.
    expect(lightTheme.colors.onAccentSubtle).toBe('rgba(27, 23, 16, 0.78)');
    expect(lightTheme.colors.onAccentLine).toBe('rgba(27, 23, 16, 0.18)');
    expect(darkTheme.colors.onAccentSubtle).toBe(
      lightTheme.colors.onAccentSubtle,
    );
    expect(darkTheme.colors.onAccentLine).toBe(lightTheme.colors.onAccentLine);
    expect(darkTheme.colors.accent).toBe(lightTheme.colors.accent);
    expect(darkTheme.colors.onAccent).toBe(lightTheme.colors.onAccent);
  });
});
