import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * A band that fades from nothing into the ground colour, drawn under a footer
 * that sits over a cut-out.
 *
 * The brand screens let the product bleed behind their buttons; without this
 * the "Próximo" button lands on whatever row of the fake screen happens to be
 * under it and both become hard to read. Drawn with `react-native-svg`, which
 * the app already carries, rather than adding a gradient package for one shape.
 */
export function GroundFade({
  color,
  height,
  /** Where the gradient reaches full colour, 0–1 of its own height. The brand
   * screens use a short run: the fade is a guard for the text, not a scrim
   * over the picture. */
  stop = 0.4,
}: {
  color: string;
  height: number;
  stop?: number;
}) {
  return (
    <Svg
      height={height}
      preserveAspectRatio="none"
      viewBox="0 0 1 1"
      width="100%"
    >
      <Defs>
        <LinearGradient id="groundFade" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0} />
          <Stop offset={stop} stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect fill="url(#groundFade)" height="1" width="1" x="0" y="0" />
    </Svg>
  );
}
