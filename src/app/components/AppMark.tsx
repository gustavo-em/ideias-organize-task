import Svg, { Path, Rect } from 'react-native-svg';

import {
  ALUZA_COLORS,
  ALUZA_SUN_CENTER,
  ALUZA_SYMBOL_INK_PATH,
  ALUZA_SYMBOL_OUTLINE_LENGTH,
  ALUZA_SYMBOL_SIZE,
  ALUZA_SYMBOL_SUN_PATH,
  ALUZA_SYMBOL_VIEWBOX,
} from './AluzaArtwork.generated';

/** The Aluza symbol, straight from `assets/brand/aluza-symbol-primary.svg`.
 * The artwork is never redrawn or distorted: every size is a uniform scale of
 * the same view box, and every adaptation is padding around it. */
export const MARK_GEOMETRY = {
  viewBox: ALUZA_SYMBOL_VIEWBOX,
  size: ALUZA_SYMBOL_SIZE,
  /** Blank kept around the symbol, in view-box units. */
  clearSpace: Math.round(ALUZA_SYMBOL_SIZE.width * 0.16),
  outlineLength: ALUZA_SYMBOL_OUTLINE_LENGTH,
  sunCenter: ALUZA_SUN_CENTER,
  /** Share of the 108dp adaptive canvas taken by the symbol, inside the
   * 66dp safe zone. */
  adaptiveShare: 46 / 108,
} as const;

export const MARK_COLORS = ALUZA_COLORS;

export const MARK_PATHS = {
  ink: ALUZA_SYMBOL_INK_PATH,
  sun: ALUZA_SYMBOL_SUN_PATH,
} as const;

interface AppMarkProps {
  size?: number;
  /** Draws the kit's cream tile behind the symbol, as on the launcher icon. */
  withTile?: boolean;
  tileColor?: string;
  tileRadius?: number;
  inkColor?: string;
  sunColor?: string;
}

export function AppMark({
  size = 96,
  withTile = false,
  tileColor = ALUZA_COLORS.cream,
  tileRadius = 0.22,
  inkColor = ALUZA_COLORS.ink,
  sunColor = ALUZA_COLORS.sun,
}: AppMarkProps) {
  const canvas = ALUZA_SYMBOL_SIZE.width;

  return (
    <Svg height={size} viewBox={ALUZA_SYMBOL_VIEWBOX} width={size}>
      {withTile ? (
        <Rect
          fill={tileColor}
          height={canvas}
          rx={canvas * tileRadius}
          width={canvas}
          x={0}
          y={0}
        />
      ) : null}
      <Path d={MARK_PATHS.ink} fill={inkColor} fillRule="evenodd" />
      <Path d={MARK_PATHS.sun} fill={sunColor} fillRule="evenodd" />
    </Svg>
  );
}
