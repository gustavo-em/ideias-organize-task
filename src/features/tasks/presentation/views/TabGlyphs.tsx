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

/** Today: the day's three slots, the middle one already filled. */
export function TodayGlyph({ color, active, size = 20 }: TabGlyphProps) {
  return (
    <Svg height={size} viewBox="0 0 20 20" width={size}>
      <Rect
        fill={active ? color : 'none'}
        height={3.4}
        rx={1.7}
        stroke={color}
        strokeWidth={1.6}
        width={15}
        x={2.5}
        y={3.4}
      />
      <Rect
        fill={color}
        height={3.4}
        rx={1.7}
        stroke={color}
        strokeWidth={1.6}
        width={15}
        x={2.5}
        y={8.3}
      />
      <Rect
        fill={active ? color : 'none'}
        height={3.4}
        rx={1.7}
        stroke={color}
        strokeWidth={1.6}
        width={15}
        x={2.5}
        y={13.2}
      />
    </Svg>
  );
}

/** Lists: stacked cards, one behind the other. */
export function ListsGlyph({ color, active, size = 20 }: TabGlyphProps) {
  return (
    <Svg height={size} viewBox="0 0 20 20" width={size}>
      <Rect
        fill="none"
        height={5}
        rx={2}
        stroke={color}
        strokeOpacity={0.55}
        strokeWidth={1.6}
        width={12}
        x={4}
        y={2.2}
      />
      <Rect
        fill={active ? color : 'none'}
        height={9.6}
        rx={2.6}
        stroke={color}
        strokeWidth={1.6}
        width={15}
        x={2.5}
        y={8}
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
        cy={6.6}
        fill={active ? color : 'none'}
        r={3.4}
        stroke={color}
        strokeWidth={1.6}
      />
      <Path
        d="M3.6 17.2c0-3.5 2.9-5.6 6.4-5.6s6.4 2.1 6.4 5.6"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.6}
      />
    </Svg>
  );
}
