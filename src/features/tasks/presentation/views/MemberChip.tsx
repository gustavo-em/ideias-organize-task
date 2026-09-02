import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import styled, { useTheme } from 'styled-components/native';

import {
  listColors,
  memberInitials,
  type ListColor,
} from '../../domain/TaskList';
import { projectTone } from '../models/projectAppearance';

type ChipSize = 'small' | 'medium' | 'large' | 'xlarge';

const DIAMETER: Record<ChipSize, number> = {
  small: 24, // only a dot of colour, no letter
  medium: 28, // the stack on a project row, and a task's finisher
  large: 30, // the member list inside the sheet
  xlarge: 64, // the person's own photo, in the profile sheet and in Você
};

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
  border-color: ${({ theme, $pending, $inverted }) =>
    $pending
      ? $inverted
        ? theme.colors.onAccentSubtle
        : theme.colors.border
      : $inverted
      ? theme.colors.accent
      : theme.colors.card};
  margin-left: ${({ $stacked }) => ($stacked ? -9 : 0)}px;
`;

const Letter = styled.Text<{ $color: string; $size: ChipSize }>`
  color: ${({ $color }) => $color};
  font-size: ${({ theme, $size }) =>
    $size === 'xlarge' ? theme.type.heading : theme.type.caption}px;
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
