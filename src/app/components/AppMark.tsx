import { Image, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { ALUZA_COLORS } from './AluzaArtwork.generated';

/** The Aluza symbol, cut straight from the brand board
 * (`assets/brand/aluza-mark.png`): the artwork itself, never redrawn, and
 * only ever scaled uniformly — no dimension of it is set on its own. */
const MARK_LIGHT = require('../../../assets/brand/aluza-mark.png');
/** Same artwork with the ink turned white, for dark surfaces. The sun keeps
 * its yellow in both. */
const MARK_DARK = require('../../../assets/brand/aluza-mark-dark.png');

// Jest resolves asset modules to a stub, so the real file's proportions get
// a safe fallback there.
const markSource = Image.resolveAssetSource(MARK_LIGHT) ?? {
  width: 266,
  height: 214,
};

export const MARK_COLORS = ALUZA_COLORS;

/** Height over width of the symbol, so any size keeps its proportions. */
export const MARK_ASPECT =
  (markSource.height ?? 270) / (markSource.width ?? 275);

interface AppMarkProps {
  /** Width in points; the height follows the artwork's own proportions. */
  size?: number;
  /** Draws the kit's cream tile behind the symbol, as on the launcher icon. */
  withTile?: boolean;
  tileColor?: string;
  tileRadius?: number;
  /** Forces one artwork; by default the theme decides. */
  variant?: 'light' | 'dark';
}

export function AppMark({
  size = 96,
  withTile = false,
  tileColor = ALUZA_COLORS.cream,
  tileRadius = 0.22,
  variant,
}: AppMarkProps) {
  const theme = useTheme();
  const dark =
    (variant ?? (theme.mode === 'dark' ? 'dark' : 'light')) === 'dark';
  const symbol = (
    <Image
      accessibilityRole="image"
      resizeMode="contain"
      source={dark ? MARK_DARK : MARK_LIGHT}
      style={{ width: size, height: size * MARK_ASPECT }}
    />
  );

  if (!withTile) return symbol;

  const tile = size * 1.45;

  return (
    <View
      style={{
        width: tile,
        height: tile,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tileColor,
        borderRadius: tile * tileRadius,
      }}
    >
      {symbol}
    </View>
  );
}
