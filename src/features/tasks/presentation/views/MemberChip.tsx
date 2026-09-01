import styled, { useTheme } from 'styled-components/native';

import {
  listColors,
  memberInitials,
  type ListColor,
} from '../../domain/TaskList';
import { projectTone } from '../models/projectAppearance';

type ChipSize = 'small' | 'medium' | 'large';

const DIAMETER: Record<ChipSize, number> = {
  small: 24, // only a dot of colour, no letter
  medium: 28, // the stack on a project row, and a task's finisher
  large: 30, // the member list inside the sheet
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
  accessibilityLabel,
}: MemberChipProps) {
  const theme = useTheme();
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
        <Letter $color={letter}>{initials ?? memberInitials(name)}</Letter>
      ) : null}
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
  background-color: ${({ $tone }) => $tone};
  border-width: ${({ $stacked, $pending }) => ($stacked || $pending ? 2 : 0)}px;
  border-style: ${({ $pending }) => ($pending ? 'dashed' : 'solid')};
  border-color: ${({ theme, $pending, $inverted }) =>
    $pending
      ? $inverted
        ? theme.colors.onAccentSubtle
        : theme.colors.border
      : theme.colors.card};
  margin-left: ${({ $stacked }) => ($stacked ? -9 : 0)}px;
`;

const Letter = styled.Text<{ $color: string }>`
  color: ${({ $color }) => $color};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
`;
