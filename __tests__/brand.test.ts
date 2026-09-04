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
      total: 1560,
      letterOpen: 530,
      rowsIn: 265,
      rowsLit: 390,
      rowsFly: 875,
      raysTakeOver: 970,
      wordmark: 1250,
      wipe: 1310,
      shortFrom: 900,
      reduced: 360,
    });
    // The rows light up while they are still: crossing the ink letter in ink
    // would hide the whole gesture for the length of the flight.
    expect(SPLASH_TIMING.rowsLit).toBeLessThan(SPLASH_TIMING.rowsFly);
    // They arrive before they light, and light before they leave.
    expect(SPLASH_TIMING.rowsIn).toBeLessThan(SPLASH_TIMING.rowsLit);
    // The mark's own rays take over as the flying rows fade, so the last
    // frame is the store icon rather than a gap where the rays should be.
    expect(SPLASH_TIMING.raysTakeOver).toBeGreaterThanOrEqual(
      SPLASH_TIMING.rowsFly,
    );
    // The wordmark answers a mark that is already whole.
    expect(SPLASH_TIMING.wordmark).toBeGreaterThan(SPLASH_TIMING.raysTakeOver);
    // Nothing is ever cut mid-morph: the wipe is last, and it is what ends it.
    expect(SPLASH_TIMING.wipe).toBeGreaterThanOrEqual(SPLASH_TIMING.wordmark);
    expect(SPLASH_TIMING.wipe).toBeLessThan(SPLASH_TIMING.total);
    // The second opening of the day starts after the morph, never inside it.
    expect(SPLASH_TIMING.shortFrom).toBeGreaterThanOrEqual(
      SPLASH_TIMING.raysTakeOver - SPLASH_TIMING.total * 0.05,
    );
    // The whole opening stays inside a band a person will sit through.
    expect(SPLASH_TIMING.total).toBeGreaterThanOrEqual(1200);
    expect(SPLASH_TIMING.total).toBeLessThanOrEqual(1800);
    // Reduced motion is a cross-fade, not a shortened morph.
    expect(SPLASH_TIMING.reduced).toBeLessThan(SPLASH_TIMING.total / 3);
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
