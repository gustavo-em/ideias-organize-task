import Svg, { Path } from 'react-native-svg';

import {
  ALUZA_COLORS,
  ALUZA_WORDMARK_PATH,
  ALUZA_WORDMARK_RATIO,
  ALUZA_WORDMARK_VIEWBOX,
} from './AluzaArtwork.generated';

export const WORDMARK_VIEWBOX = ALUZA_WORDMARK_VIEWBOX;
export const WORDMARK_RATIO = ALUZA_WORDMARK_RATIO;
export const WORDMARK_SOURCE = 'assets/brand/aluza-logo-primary.svg';

interface AppWordmarkProps {
  color?: string;
  /** Height in points. The width follows the kit ratio, so the letters are
   * never stretched to fill a box. */
  height?: number;
}

/** The "aluza" wordmark, outlined in the official kit: no font dependency and
 * no redrawing. */
export function AppWordmark({
  color = ALUZA_COLORS.ink,
  height = 24,
}: AppWordmarkProps) {
  return (
    <Svg
      height={height}
      viewBox={ALUZA_WORDMARK_VIEWBOX}
      width={height * ALUZA_WORDMARK_RATIO}
    >
      <Path d={ALUZA_WORDMARK_PATH} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
