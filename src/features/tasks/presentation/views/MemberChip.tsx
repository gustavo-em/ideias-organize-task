import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import styled, { useTheme } from 'styled-components/native';

import {
  listColors,
  memberInitials,
  type ListColor,
} from '../../domain/TaskList';
import { projectTone } from '../models/projectAppearance';

type ChipSize =
  | 'fact'
  | 'small'
  | 'medium'
  | 'row'
  | 'large'
  | 'header'
  | 'xlarge';

const DIAMETER: Record<ChipSize, number> = {
  fact: 22, // the fact slot of a task row: who took it
  small: 24, // only a dot of colour, no letter
  medium: 28, // the stack on a project row, and a task's finisher
  row: 28, // the stack on a line of the spaces index, straight on the floor
  large: 30, // the member list inside the sheet
  header: 34, // the stack beside an open space's name
  xlarge: 64, // the person's own photo, in the profile sheet and in Você
};

/** How far a stacked chip reaches back over the one before it. */
const OVERLAP: Record<ChipSize, number> = {
  fact: -6,
  small: -9,
  medium: -9,
  row: -8,
  large: -9,
  header: -10,
  xlarge: -9,
};

/** The letters, sized to the disc they sit in. */
function letterSize(
  theme: { type: { heading: number; label: number; caption: number } },
  size: ChipSize,
): number {
  if (size === 'xlarge') return theme.type.heading;
  if (size === 'header') return theme.type.label;
  if (size === 'fact') return theme.type.caption - 1;
  return theme.type.caption;
}

interface MemberChipProps {
  name: string;
  /** A stable id the tone is derived from — never the tone itself, so a
   * person never looks like someone else between two screens. */
  personId: string;
  size?: ChipSize;
  /** On the stack: clips the chip before it. */
  stacked?: boolean;
  /** Invite not yet accepted: dashed outline, no fill. */
  pending?: boolean;
  /** Inside an accent band: the tonal fill would disappear in the yellow, so
   * the chip inverts — ink ground, yellow letter. */
  inverted?: boolean;
  /** Overrides the letters derived from the name. Set where the row is not a
   * name — the logged-in person reads as "Você", and the ficha as VC. */
  initials?: string;
  /** The person's photo. Drawn over the initials, which stay underneath as
   * the ground: a photo that is still loading, or that fails to load, leaves
   * the letters exactly where they were. Ignored while `pending`. */
  photoURL?: string | null;
  /** Set only where this one chip carries its own meaning — a task's
   * finisher, say. Left unset, the chip stays silent for a screen reader,
   * which is right inside a `MemberStack` that already announced itself. */
  accessibilityLabel?: string;
  /** What ground the ring around a stacked chip is cut from: the card the
   * stack sits on, or the screen's own floor when it sits straight on it. */
  ring?: 'card' | 'background';
}

/** A short, stable hash so the same person always lands on the same tone,
 * without a server round trip to decide it. */
function toneFor(personId: string): ListColor {
  let hash = 0;
  for (let index = 0; index < personId.length; index += 1) {
    hash = (hash * 31 + personId.charCodeAt(index)) % listColors.length;
  }

  return listColors[Math.abs(hash) % listColors.length];
}

/** The ficha of initials a member is known by, everywhere the app shows who
 * is in a shared project. One component, three sizes, nothing else. */
export function MemberChip({
  name,
  personId,
  size = 'medium',
  stacked = false,
  pending = false,
  inverted = false,
  initials,
  photoURL,
  accessibilityLabel,
  ring = 'card',
}: MemberChipProps) {
  const theme = useTheme();
  const photo = pending ? null : photoURL ?? null;
  const [broken, setBroken] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  // A different photo starts over: the letters show again until the new one
  // has actually arrived.
  useEffect(() => {
    setBroken(false);
    opacity.setValue(0);
  }, [opacity, photo]);
  const tone = projectTone(theme, toneFor(personId));
  const diameter = DIAMETER[size];
  const onSun = toneFor(personId) === 'sun';
  const fill = inverted ? theme.colors.onAccent : tone;
  const letter = inverted
    ? pending
      ? theme.colors.onAccentSubtle
      : theme.colors.accent
    : pending
    ? theme.colors.mutedStrong
    : onSun
    ? theme.colors.onAccent
    : theme.colors.card;

  return (
    <Chip
      $d={diameter}
      $inverted={inverted}
      $pending={pending}
      $ring={ring}
      $size={size}
      $stacked={stacked}
      $tone={pending ? 'transparent' : fill}
      accessibilityElementsHidden={accessibilityLabel == null}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={
        accessibilityLabel == null ? 'no-hide-descendants' : 'yes'
      }
    >
      {size !== 'small' ? (
        <Letter $color={letter} $size={size}>
          {initials ?? memberInitials(name)}
        </Letter>
      ) : null}
      {photo == null || broken ? null : (
        <Photo
          accessibilityIgnoresInvertColors
          onError={() => setBroken(true)}
          onLoad={() => {
            Animated.timing(opacity, {
              toValue: 1,
              duration: 150,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start();
          }}
          resizeMode="cover"
          source={{ uri: photo }}
          style={{ opacity }}
          testID="member-chip-photo"
        />
      )}
    </Chip>
  );
}

const Chip = styled.View<{
  $d: number;
  $tone: string;
  $stacked: boolean;
  $pending: boolean;
  $inverted: boolean;
  $ring: 'card' | 'background';
  $size: ChipSize;
}>`
  width: ${({ $d }) => $d}px;
  height: ${({ $d }) => $d}px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: ${({ $tone }) => $tone};
  border-width: ${({ $stacked, $pending }) => ($stacked || $pending ? 2 : 0)}px;
  border-style: ${({ $pending }) => ($pending ? 'dashed' : 'solid')};
  border-color: ${({ theme, $pending, $inverted, $ring }) =>
    $pending
      ? $inverted
        ? theme.colors.onAccentSubtle
        : theme.colors.border
      : $inverted
      ? theme.colors.accent
      : $ring === 'background'
      ? theme.colors.background
      : theme.colors.card};
  margin-left: ${({ $stacked, $size }) => ($stacked ? OVERLAP[$size] : 0)}px;
`;

const Letter = styled.Text<{ $color: string; $size: ChipSize }>`
  color: ${({ $color }) => $color};
  font-size: ${({ theme, $size }) => letterSize(theme, $size)}px;
  font-weight: 800;
`;

/** The photo sits over the letters, inside the ring the chip already draws. */
const Photo = styled(Animated.Image)`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
`;
