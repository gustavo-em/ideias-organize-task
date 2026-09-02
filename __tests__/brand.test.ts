import { darkTheme, lightTheme } from '../src/app/theme/theme';
import {
  MARK_COLORS,
  MARK_GEOMETRY,
  MARK_PATHS,
} from '../src/app/components/AppMark';
import { SPLASH_TIMING } from '../src/app/components/AppSplash';
import {
  ALUZA_SUN_CENTERS,
  ALUZA_SYMBOL_SUN_PATHS,
} from '../src/app/components/AluzaArtwork.generated';
import {
  WORDMARK_RATIO,
  WORDMARK_SOURCE,
  WORDMARK_VIEWBOX,
} from '../src/app/components/AppWordmark';
import { APP_NAME } from '../src/app/config/appMetadata';

const SUN_STROKE_COUNT = ALUZA_SYMBOL_SUN_PATHS.length;

describe('brand contract', () => {
  it('lights the sun one stroke at a time, each with its own centre', () => {
    expect(SUN_STROKE_COUNT).toBeGreaterThan(1);
    expect(ALUZA_SUN_CENTERS).toHaveLength(SUN_STROKE_COUNT);
    // Every stroke is part of the one kit path: nothing here is redrawn.
    for (const stroke of ALUZA_SYMBOL_SUN_PATHS) {
      expect(stroke.startsWith('M')).toBe(true);
      expect(MARK_PATHS.sun).toContain(stroke);
    }
  });

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
      mark: 320,
      settle: 520,
      sunDelay: 360,
      sun: 220,
      sunStagger: 80,
      wordmark: 260,
      wordmarkDelay: 820,
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
    // The sun lights up before the wordmark answers it.
    expect(
      SPLASH_TIMING.sunDelay +
        SPLASH_TIMING.sunStagger * SUN_STROKE_COUNT +
        SPLASH_TIMING.sun,
    ).toBeLessThanOrEqual(SPLASH_TIMING.wordmarkDelay + SPLASH_TIMING.wordmark);
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

  it('keeps the wordmark outlined from the official kit', () => {
    expect(WORDMARK_SOURCE).toBe('assets/brand/aluza-logo-primary.svg');
    expect(WORDMARK_VIEWBOX.startsWith('0 0 ')).toBe(true);
    // Width follows the kit ratio: the letters are never stretched to fit.
    expect(WORDMARK_RATIO).toBeGreaterThan(2.5);
  });
});
