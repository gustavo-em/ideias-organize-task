import Animated, { FadeIn } from 'react-native-reanimated';
import styled from 'styled-components/native';

import type { ListMember } from '../../domain/TaskList';
import { MemberChip } from './MemberChip';

interface MemberStackProps {
  members: readonly ListMember[];
  sharedWithLabel: string;
  /** Past this many, the rest becomes a `+N` chip. */
  cap?: number;
}

const DEFAULT_CAP = 3;

/** Who is in a shared project, read at a glance from a project row or a
 * task's finisher. The label speaks for the whole stack; the chips inside
 * stay silent to a screen reader. */
export function MemberStack({
  members,
  sharedWithLabel,
  cap = DEFAULT_CAP,
}: MemberStackProps) {
  if (members.length === 0) return null;

  const shown = members.slice(0, cap);
  const overflow = members.length - shown.length;

  return (
    <Stack accessibilityLabel={sharedWithLabel} entering={FadeIn.duration(180)}>
      {shown.map((member, index) => (
        <MemberChip
          key={member.personId}
          name={member.name}
          personId={member.personId}
          pending={!member.joined}
          size="medium"
          stacked={index > 0}
        />
      ))}
      {overflow > 0 ? <Overflow>{`+${overflow}`}</Overflow> : null}
    </Stack>
  );
}

const Stack = styled(Animated.View)`
  flex-direction: row;
  align-items: center;
`;

const Overflow = styled.Text`
  margin-left: 6px;
  color: ${({ theme }) => theme.colors.accentInk};
  background-color: ${({ theme }) => theme.colors.cardElevated};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  width: 28px;
  height: 28px;
  line-height: 28px;
  text-align: center;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  overflow: hidden;
`;
