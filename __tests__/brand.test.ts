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

  it('keeps the approved licensed Bricolage Grotesque wordmark', () => {
    expect(IDEIAS_WORDMARK_LICENSE).toBe('SIL Open Font License 1.1');
    expect(IDEIAS_WORDMARK_SOURCE).toContain('google/fonts');
    expect(IDEIAS_WORDMARK_VIEWBOX).toBe('0 0 2816 758');
  });
});
