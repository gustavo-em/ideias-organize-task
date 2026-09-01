import { css } from 'styled-components/native';

/**
 * The two things every button label in this app needs.
 *
 * A label is a word the user is about to act on: it belongs on one line, at a
 * size the button was measured for. pt-BR words run longer than en-US ones, and
 * the system font scale can add another 30% on top, so without a ceiling the
 * same button that fits in English wraps into two lines in Portuguese.
 *
 * `ellipsizeMode` is the net, not the plan — if a label ever reaches it, the
 * button is too narrow and the layout is what needs fixing.
 */
export const buttonTextAttrs = {
  numberOfLines: 1 as const,
  ellipsizeMode: 'tail' as const,
  maxFontSizeMultiplier: 1.3,
};

/**
 * Vertical metrics shared by every button label.
 *
 * Android adds font padding above and below a Text box, and the amount depends
 * on the glyphs in it — which is why two buttons side by side, one reading
 * "Prazo" and one "Prioridade", sit at different heights. Turning that padding
 * off and setting an explicit line height makes the two platforms agree, and
 * makes siblings share a baseline.
 *
 * Content text keeps the default padding: only labels use this.
 */
export const buttonTextMetrics = (fontSize: number) => css`
  font-size: ${fontSize}px;
  line-height: ${fontSize + 6}px;
  include-font-padding: false;
  text-align-vertical: center;
`;
