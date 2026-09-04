import { Image } from 'react-native';

/**
 * The brand symbol, at whatever size a screen asks for.
 *
 * One file per ground rather than one file recoloured: the mark is two colours
 * — ink and light — and an `Image` tint would flatten both into a single
 * silhouette. The three cuts are composed from the same two layers, so they
 * cannot drift apart.
 *
 * They are rasters because the mark itself is one. The drawing the app ships
 * arrived as a 512px export; the vector kit in `assets/brand` is an older
 * drawing of the same letter, and so is everything in
 * `AluzaArtwork.generated.ts`. If a real vector of this mark ever arrives,
 * feed it to `scripts/generate-aluza-brand.py` and this can go back to paths.
 *
 * `AppMark` still ships the PNG lockup used by the store; this is the symbol
 * alone, for the brand screens.
 */
export type AluzaSymbolVariant = 'onSol' | 'onTinta' | 'primary';

interface AluzaSymbolProps {
  size?: number;
  /** Which ground the symbol sits on. Decides which cut is drawn. */
  variant?: AluzaSymbolVariant;
}

/**
 * On Sol the light is white, so it reads as light coming off the mark rather
 * than as a second yellow on a yellow floor. On Tinta the letter turns to
 * paper and the light takes the brand yellow. On a light ground both are the
 * ink and yellow of the primary lockup.
 */
const ART = {
  onSol: require('../../../assets/brand/aluza-mark-on-sol.png'),
  onTinta: require('../../../assets/brand/aluza-mark-on-tinta.png'),
  primary: require('../../../assets/brand/aluza-mark-primary.png'),
} as const;

export function AluzaSymbol({
  size = 32,
  variant = 'primary',
}: AluzaSymbolProps) {
  return (
    <Image
      resizeMode="contain"
      source={ART[variant]}
      style={{ width: size, height: size }}
    />
  );
}
