import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * One glyph per destination.
 *
 * The bar was four words and a moving dot. Words alone make every tab look
 * like the same kind of place; the shapes are what let somebody find the one
 * they want without reading.
 */

interface TabGlyphProps {
  color: string;
  active: boolean;
  size?: number;
}

/** Today: three lines of the day's list, longest first. */
export function TodayGlyph({ color, active, size = 20 }: TabGlyphProps) {
  const stroke = active ? 2.4 : 2;

  return (
    <Svg height={size} viewBox="0 0 20 20" width={size}>
      <Path
        d="M3.4 5h13.2"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={stroke}
      />
      <Path
        d="M3.4 10h9.4"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={stroke}
      />
      <Path
        d="M3.4 15h5.6"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={stroke}
      />
    </Svg>
  );
}

/** Lists: two spaces stacked, the same size — shelves, not a pile. */
export function ListsGlyph({ color, active, size = 20 }: TabGlyphProps) {
  const stroke = active ? 2.2 : 1.8;

  return (
    <Svg height={size} viewBox="0 0 20 20" width={size}>
      <Rect
        fill="none"
        height={5.6}
        rx={2.8}
        stroke={color}
        strokeWidth={stroke}
        width={13}
        x={3.5}
        y={3}
      />
      <Rect
        fill="none"
        height={5.6}
        rx={2.8}
        stroke={color}
        strokeWidth={stroke}
        width={13}
        x={3.5}
        y={11.4}
      />
    </Svg>
  );
}

/** Focus: the ring, with the arc that runs down. */
export function FocusGlyph({ color, active, size = 20 }: TabGlyphProps) {
  return (
    <Svg height={size} viewBox="0 0 20 20" width={size}>
      <Circle
        cx={10}
        cy={10}
        fill="none"
        r={7.4}
        stroke={color}
        strokeOpacity={0.45}
        strokeWidth={1.6}
      />
      <Path
        d="M10 2.6a7.4 7.4 0 0 1 7.4 7.4"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2.2}
      />
      <Circle cx={10} cy={10} fill={color} r={active ? 2.6 : 1.6} />
    </Svg>
  );
}

/** You: the person the streak belongs to. */
export function YouGlyph({ color, active, size = 20 }: TabGlyphProps) {
  return (
    <Svg height={size} viewBox="0 0 20 20" width={size}>
      <Circle
        cx={10}
        cy={6.4}
        fill="none"
        r={3.2}
        stroke={color}
        strokeWidth={active ? 2.2 : 1.8}
      />
      <Path
        d="M3.8 17c0-3.4 2.8-5.4 6.2-5.4s6.2 2 6.2 5.4"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={active ? 2.2 : 1.8}
      />
    </Svg>
  );
}
