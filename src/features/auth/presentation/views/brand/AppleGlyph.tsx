import Svg, { Path } from 'react-native-svg';

/** The Apple mark, in the single colour the guidelines allow next to the
 * button label: black on a white button, white on a black one. */
export function AppleGlyph({
  color,
  size = 18,
}: {
  color: string;
  size?: number;
}) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M16.36 12.62c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.82 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.47 7.81 1.3 10.36.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.38.81 1.4-.02 2.28-1.27 3.13-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.14zM13.9 4.99c.71-.87 1.19-2.07 1.06-3.28-1.02.04-2.27.68-3.01 1.55-.66.76-1.24 1.99-1.09 3.16 1.14.09 2.31-.58 3.04-1.43z"
        fill={color}
      />
    </Svg>
  );
}
