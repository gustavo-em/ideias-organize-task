import Animated from 'react-native-reanimated';

import { fadeEnter } from '../../../../app/animation/motion';
import styled from 'styled-components/native';

import type { ListMember } from '../../domain/TaskList';
import { MemberChip } from './MemberChip';

interface MemberStackProps {
  members: readonly ListMember[];
  sharedWithLabel: string;
  /** Past this many, the rest becomes a `+N` chip. */
  cap?: number;
  /** `medium` on a card and a task's finisher; `row` on a line of the
   * spaces index and `header` beside the name of an open space, where the
   * chips sit straight on the floor and the ring between them is cut from
   * it. */
  size?: 'medium' | 'row' | 'header';
}

const DEFAULT_CAP = 3;

/** Who is in a shared project, read at a glance from a project row or a
 * task's finisher. The label speaks for the whole stack; the chips inside
 * stay silent to a screen reader. */
export function MemberStack({
  members,
  sharedWithLabel,
  cap = DEFAULT_CAP,
  size = 'medium',
}: MemberStackProps) {
  if (members.length === 0) return null;

  const shown = members.slice(0, cap);
  const overflow = members.length - shown.length;

  return (
    <Stack accessibilityLabel={sharedWithLabel} entering={fadeEnter()}>
      {shown.map((member, index) => (
        <MemberChip
          key={member.personId}
          name={member.name}
          pending={!member.joined}
          personId={member.personId}
          photoURL={member.photoURL ?? null}
          ring={size === 'medium' ? 'card' : 'background'}
          size={size}
          stacked={index > 0}
        />
      ))}
      {overflow > 0 ? <Overflow $size={size}>{`+${overflow}`}</Overflow> : null}
    </Stack>
  );
}

const Stack = styled(Animated.View)`
  flex-direction: row;
  align-items: center;
`;

const Overflow = styled.Text<{ $size: 'medium' | 'row' | 'header' }>`
  margin-left: 6px;
  color: ${({ theme }) => theme.colors.accentInk};
  background-color: ${({ theme }) => theme.colors.cardNeutral};
  font-size: ${({ theme, $size }) =>
    $size === 'header' ? theme.type.label : theme.type.caption}px;
  font-weight: 800;
  width: ${({ $size }) => ($size === 'header' ? 34 : 28)}px;
  height: ${({ $size }) => ($size === 'header' ? 34 : 28)}px;
  line-height: ${({ $size }) => ($size === 'header' ? 34 : 28)}px;
  text-align: center;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  overflow: hidden;
`;
