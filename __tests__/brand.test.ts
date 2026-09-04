import { darkTheme, lightTheme } from '../src/app/theme/theme';
import {
  ALUZA_MARK_OPEN_AT,
  ALUZA_MARK_RAY_CENTERS,
  ALUZA_MARK_RAY_PATHS,
} from '../src/app/components/AluzaMark.generated';
import { SPLASH_TIMING } from '../src/app/components/AppSplash';
import { APP_NAME } from '../src/app/config/appMetadata';

describe('brand contract', () => {
  it('carries the Aluza name', () => {
    expect(APP_NAME).toBe('Aluza');
  });

  it('lands the opening on the mark it is drawn from', () => {
    // The three rows fly onto the three rays. When the mark was redrawn and
    // these centres were still the old hand-measured ones, the rows parked
    // beside the letter instead of becoming it — and nothing looked broken.
    expect(ALUZA_MARK_RAY_PATHS).toHaveLength(3);
    expect(ALUZA_MARK_RAY_CENTERS).toHaveLength(3);

    for (const centre of ALUZA_MARK_RAY_CENTERS) {
      // Inside the frame, and in the quadrant the light lives in: up and to
      // the right of the letter.
      expect(centre.x).toBeGreaterThan(0.5);
      expect(centre.x).toBeLessThan(1);
      expect(centre.y).toBeGreaterThan(0);
      expect(centre.y).toBeLessThan(0.5);
    }

    // Drawn in the order the opening lands them: clockwise, from the highest.
    expect(ALUZA_MARK_RAY_CENTERS[0].y).toBeLessThan(
      ALUZA_MARK_RAY_CENTERS[1].y,
    );
    expect(ALUZA_MARK_RAY_CENTERS[1].y).toBeLessThan(
      ALUZA_MARK_RAY_CENTERS[2].y,
    );

    // The opening grows out of the letter's bowl, which is left of centre and
    // below the middle — never out of the middle of the picture.
    expect(ALUZA_MARK_OPEN_AT.x).toBeGreaterThan(0.2);
    expect(ALUZA_MARK_OPEN_AT.x).toBeLessThan(0.5);
    expect(ALUZA_MARK_OPEN_AT.y).toBeGreaterThan(0.45);
    expect(ALUZA_MARK_OPEN_AT.y).toBeLessThan(0.75);
  });

  it('keeps the launch timing bounds', () => {
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
