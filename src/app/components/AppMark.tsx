import Svg, { Path, Rect } from 'react-native-svg';

/** Single source of truth for the 120-unit brand master. */
export const MARK_GEOMETRY = {
  canvas: 120,
  clearSpace: 16,
  strokeWidth: 14,
  tileRadius: 30,
  list: {
    a: { start: { x: 31, y: 36 }, end: { x: 79, y: 36 } },
    b: { start: { x: 31, y: 59 }, end: { x: 89, y: 59 } },
    c: { start: { x: 31, y: 82 }, end: { x: 65, y: 82 } },
  },
  check: {
    vertex: { x: 47, y: 78 },
    short: { start: { x: 29, y: 60 }, end: { x: 47, y: 78 } },
    long: { start: { x: 47, y: 78 }, end: { x: 89, y: 36 } },
  },
  spark: {
    center: { x: 92, y: 28 },
    path: 'M92 21 C93.2 21 93.7 23.9 94.4 25.6 C96.1 26.3 99 26.8 99 28 C99 29.2 96.1 29.7 94.4 30.4 C93.7 32.1 93.2 35 92 35 C90.8 35 90.3 32.1 89.6 30.4 C87.9 29.7 85 29.2 85 28 C85 26.8 87.9 26.3 89.6 25.6 C90.3 23.9 90.8 21 92 21 Z',
  },
  smallSpark:
    'M92 24.2 C92.5 24.2 95.8 27.5 95.8 28 C95.8 28.5 92.5 31.8 92 31.8 C91.5 31.8 88.2 28.5 88.2 28 C88.2 27.5 91.5 24.2 92 24.2 Z',
} as const;

export const MARK_COLORS = {
  sun: '#FFC63D',
  ink: '#1B1710',
  grape: '#4B3A8F',
  grapeLight: '#A895F5',
  paper: '#FFFDF7',
  darkBackground: '#141008',
  darkWordmark: '#FBF3E1',
} as const;

export const MARK_PATHS = {
  check: 'M29 60 L47 78 L89 36',
  listA: 'M31 36 L79 36',
  listB: 'M31 59 L89 59',
  listC: 'M31 82 L65 82',
} as const;

interface AppMarkProps {
  size?: number;
  withTile?: boolean;
  tileColor?: string;
  inkColor?: string;
  sparkColor?: string;
  state?: 'list' | 'check';
}

export function AppMark({
  size = 96,
  withTile = true,
  tileColor = MARK_COLORS.sun,
  inkColor = MARK_COLORS.ink,
  sparkColor = MARK_COLORS.grape,
  state = 'check',
}: AppMarkProps) {
  const isSmall = size < 32;

  return (
    <Svg height={size} viewBox="0 0 120 120" width={size}>
      {withTile ? (
        <Rect
          fill={tileColor}
          height={MARK_GEOMETRY.canvas}
          rx={MARK_GEOMETRY.tileRadius}
          width={MARK_GEOMETRY.canvas}
        />
      ) : null}
      {state === 'list' ? (
        <>
          <MarkStroke color={inkColor} path={MARK_PATHS.listA} />
          <MarkStroke color={inkColor} path={MARK_PATHS.listB} />
          <MarkStroke color={sparkColor} path={MARK_PATHS.listC} />
        </>
      ) : (
        <>
          <MarkStroke color={inkColor} path={MARK_PATHS.check} />
          <Path
            d={isSmall ? MARK_GEOMETRY.smallSpark : MARK_GEOMETRY.spark.path}
            fill={sparkColor}
          />
        </>
      )}
    </Svg>
  );
}

function MarkStroke({ color, path }: { color: string; path: string }) {
  return (
    <Path
      d={path}
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={MARK_GEOMETRY.strokeWidth}
    />
  );
}
