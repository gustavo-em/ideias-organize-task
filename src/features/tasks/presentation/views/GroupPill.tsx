import styled, { useTheme } from 'styled-components/native';

import type { TaskGroup } from '../../domain/TaskGroup';
import { projectInk, projectTint } from '../models/projectAppearance';
import { ProjectGlyph } from './FieldGlyphs';

interface GroupPillProps {
  group: TaskGroup;
  /** Spoken as "Grupo Aniversário da vó Cida", so a screen reader never reads
   * a bare name and leaves the listener guessing what it belongs to. */
  label: string;
}

/**
 * What a group's task carries when it is seen from anywhere but the group.
 *
 * In the day, in Tarefas and in Foco, "Confirmar o salão" on its own is a task
 * with no reason attached to it. The pill is that reason: the group's icon and
 * name, on the group's own wash — small enough to sit under a title, coloured
 * enough to tie the line back to the block it came from.
 */
export function GroupPill({ group, label }: GroupPillProps) {
  const theme = useTheme();
  const ink = projectInk(theme, group.color);

  return (
    <Pill
      $tint={projectTint(theme, group.color)}
      accessibilityLabel={label}
      testID={`group-pill-${group.id}`}
    >
      <ProjectGlyph color={ink} icon={group.icon} size={10} />
      <PillText $ink={ink} numberOfLines={1}>
        {group.name}
      </PillText>
    </Pill>
  );
}

const Pill = styled.View<{ $tint: string }>`
  flex-direction: row;
  align-items: center;
  align-self: flex-start;
  max-width: 100%;
  gap: ${({ theme }) => theme.spacing.tiny}px;
  padding: 2px 7px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ $tint }) => $tint};
`;

const PillText = styled.Text<{ $ink: string }>`
  flex-shrink: 1;
  color: ${({ $ink }) => $ink};
  font-size: ${({ theme }) => theme.type.caption - 1}px;
  font-weight: 700;
`;
