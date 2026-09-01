import { darkTheme, lightTheme } from '../src/app/theme/theme';
import {
  MARK_COLORS,
  MARK_GEOMETRY,
  MARK_PATHS,
} from '../src/app/components/AppMark';
import { SPLASH_TIMING } from '../src/app/components/AppSplash';
import {
  IDEIAS_WORDMARK_LICENSE,
  IDEIAS_WORDMARK_SOURCE,
  IDEIAS_WORDMARK_VIEWBOX,
} from '../src/app/components/AppWordmark.generated';

describe('brand contract', () => {
  it('keeps the approved check, spark and clear-space geometry', () => {
    expect(MARK_GEOMETRY.canvas).toBe(120);
    expect(MARK_GEOMETRY.clearSpace).toBe(16);
    expect(MARK_GEOMETRY.strokeWidth).toBe(14);
    expect(MARK_GEOMETRY.check.vertex).toEqual({ x: 47, y: 78 });
    expect(MARK_GEOMETRY.spark.center).toEqual({ x: 92, y: 28 });
    expect(MARK_PATHS.check).toBe('M29 60 L47 78 L89 36');
  });

  it('keeps the approved palette and launch timing bounds', () => {
    expect(MARK_COLORS).toMatchObject({
      sun: '#FFC63D',
      ink: '#1B1710',
      grape: '#4B3A8F',
      paper: '#FFFDF7',
      darkBackground: '#141008',
    });
    expect(SPLASH_TIMING).toEqual({
      morph: 420,
      fade: 140,
      compact: 180,
      reducedFade: 80,
      slowState: 1500,
    });
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

  it('keeps the approved licensed Bricolage Grotesque wordmark', () => {
    expect(IDEIAS_WORDMARK_LICENSE).toBe('SIL Open Font License 1.1');
    expect(IDEIAS_WORDMARK_SOURCE).toContain('google/fonts');
    expect(IDEIAS_WORDMARK_VIEWBOX).toBe('0 0 2816 758');
  });
});
