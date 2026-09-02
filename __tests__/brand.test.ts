import { darkTheme, lightTheme } from '../src/app/theme/theme';
import {
  MARK_COLORS,
  MARK_GEOMETRY,
  MARK_PATHS,
} from '../src/app/components/AppMark';
import { SPLASH_TIMING } from '../src/app/components/AppSplash';
import {
  WORDMARK_RATIO,
  WORDMARK_SOURCE,
  WORDMARK_VIEWBOX,
} from '../src/app/components/AppWordmark';
import { APP_NAME } from '../src/app/config/appMetadata';

describe('brand contract', () => {
  it('carries the Aluza name', () => {
    expect(APP_NAME).toBe('Aluza');
  });

  it('keeps the kit symbol square, so no size ever distorts it', () => {
    expect(MARK_GEOMETRY.size.width).toBe(MARK_GEOMETRY.size.height);
    expect(MARK_GEOMETRY.viewBox).toBe(
      `0 0 ${MARK_GEOMETRY.size.width.toFixed(
        2,
      )} ${MARK_GEOMETRY.size.height.toFixed(2)}`,
    );
    expect(MARK_GEOMETRY.outlineLength).toBeGreaterThan(0);
    // 46dp of the 108dp adaptive canvas: inside the 66dp safe zone.
    expect(MARK_GEOMETRY.adaptiveShare).toBeCloseTo(46 / 108, 5);
    expect(MARK_PATHS.ink.startsWith('M')).toBe(true);
    expect(MARK_PATHS.sun.startsWith('M')).toBe(true);
  });

  it('keeps the kit palette and the launch timing bounds', () => {
    expect(MARK_COLORS).toMatchObject({
      ink: '#1D1D1B',
      sun: '#FFC107',
      cream: '#F6F3EC',
      white: '#FFFFFF',
    });
    expect(SPLASH_TIMING).toEqual({
      draw: 640,
      fill: 240,
      fillDelay: 460,
      spark: 260,
      sparkDelay: 520,
      wordmark: 200,
      wordmarkDelay: 620,
      minVisible: 900,
      fade: 140,
      compact: 100,
      reducedFade: 80,
      slowState: 1500,
    });
    // The whole sequence has to be over before the floor that holds it on
    // screen, so the mark is never cut mid-drawing.
    expect(
      SPLASH_TIMING.wordmarkDelay + SPLASH_TIMING.wordmark,
    ).toBeLessThanOrEqual(SPLASH_TIMING.minVisible);
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

  it('keeps the wordmark outlined from the official kit', () => {
    expect(WORDMARK_SOURCE).toBe('assets/brand/aluza-logo-primary.svg');
    expect(WORDMARK_VIEWBOX.startsWith('0 0 ')).toBe(true);
    // Width follows the kit ratio: the letters are never stretched to fit.
    expect(WORDMARK_RATIO).toBeGreaterThan(2.5);
  });
});
