import { Image } from 'react-native';
import { useTheme } from 'styled-components/native';

/** The "aluza" wordmark, cut straight from the brand board
 * (`assets/brand/aluza-wordmark.png`): no font dependency, no redrawing, and
 * only uniform scaling — the letters are never stretched to fill a box. */
const WORDMARK_LIGHT = require('../../../assets/brand/aluza-wordmark.png');
const WORDMARK_DARK = require('../../../assets/brand/aluza-wordmark-dark.png');

const wordSource = Image.resolveAssetSource(WORDMARK_LIGHT) ?? {
  width: 485,
  height: 223,
};

export const WORDMARK_RATIO =
  (wordSource.width ?? 485) / (wordSource.height ?? 223);

interface AppWordmarkProps {
  /** Height in points. The width follows the artwork's own ratio. */
  height?: number;
  /** Forces one artwork; by default the theme decides. */
  variant?: 'light' | 'dark';
}

export function AppWordmark({ height = 24, variant }: AppWordmarkProps) {
  const theme = useTheme();
  const dark =
    (variant ?? (theme.mode === 'dark' ? 'dark' : 'light')) === 'dark';

  return (
    <Image
      accessibilityRole="image"
      resizeMode="contain"
      source={dark ? WORDMARK_DARK : WORDMARK_LIGHT}
      style={{ width: height * WORDMARK_RATIO, height }}
    />
  );
}
