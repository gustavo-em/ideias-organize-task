import styled, { useTheme } from 'styled-components/native';

import type { ListColor, ProjectIcon } from '../../domain/TaskList';
import type { TaskFacts as Facts } from '../models/taskMeta';
import {
  CalendarGlyph,
  ChecklistGlyph,
  ClockGlyph,
  PriorityGlyph,
  ProjectGlyph,
} from './FieldGlyphs';
import { projectTone } from '../models/projectAppearance';

interface TaskFactsProps {
  facts: Facts;
  listColor: ListColor | null;
  listIcon: ProjectIcon | null;
  dimmed: boolean;
  /** The deadline view keeps a card to one deliberate, scan-friendly line. */
  compact?: boolean;
}

/**
 * The line under a task title.
 *
 * Each fact carries the glyph of its own kind, because the words alone never
 * said what they were: "média" could have been a size, "amanhã" could have
 * been how long the task takes. The three-rung scale means priority, the
 * calendar means a deadline, the clock means time sitting untouched, and the
 * coloured dot means a list.
 */
export function TaskFacts({
  facts,
  listColor,
  listIcon,
  dimmed,
  compact = false,
}: TaskFactsProps) {
  const theme = useTheme();
  // Priority and lateness are not danger: `danger` belongs to the destructive
  // action alone. High priority reads as the strongest ink on the card.
  const toneOf = {
    danger: theme.colors.text,
    accent: theme.colors.accentInk,
    muted: theme.colors.muted,
  };
  // A finished task fades by colour rather than by opacity. Any static opacity
  // in here is a property a layout animation may overwrite, and Reanimated
  // warns about it once per card.
  const priorityColor = dimmed
    ? theme.colors.border
    : toneOf[facts.priority.tone];
  const dueColor = dimmed
    ? theme.colors.border
    : facts.due?.late
    ? theme.colors.text
    : theme.colors.muted;
  const quiet = dimmed ? theme.colors.border : theme.colors.muted;

  return (
    <Row $compact={compact}>
      <Fact>
        <PriorityGlyph
          color={priorityColor}
          level={facts.priority.level}
          size={13}
        />
        {compact ? null : (
          <Label $color={priorityColor}>{facts.priority.label}</Label>
        )}
      </Fact>

      {/* On the deadline view, the section heading already names the date for
          every task beneath it. Repeating it here spends the width needed by
          the title and controls. */}
      {compact || facts.due == null ? null : (
        <Fact>
          <CalendarGlyph color={dueColor} size={11} />
          <Label $color={dueColor} $strong={facts.due.late}>
            {facts.due.label}
          </Label>
        </Fact>
      )}

      {compact || facts.stale == null ? null : (
        <Fact>
          <ClockGlyph color={quiet} size={11} />
          <Label $color={quiet}>{facts.stale.label}</Label>
        </Fact>
      )}

      {/* Steps done out of steps written, as a fact like any other: no bar, no
          pill, and nothing at all on a task nobody broke down. */}
      {compact || facts.subtasks == null ? null : (
        <Fact accessibilityLabel={facts.subtasks.label}>
          <ChecklistGlyph color={quiet} size={13} />
          <Label $color={quiet}>
            {`${facts.subtasks.done}/${facts.subtasks.total}`}
          </Label>
        </Fact>
      )}

      {compact || facts.listName == null ? null : (
        <Fact>
          <ProjectGlyph
            color={
              dimmed || listColor == null
                ? theme.colors.border
                : projectTone(theme, listColor)
            }
            icon={listIcon ?? 'layers'}
            size={13}
          />
          <Label $color={quiet}>{facts.listName}</Label>
        </Fact>
      )}
    </Row>
  );
}

const Row = styled.View<{ $compact: boolean }>`
  flex-direction: row;
  align-items: center;
  flex: ${({ $compact }) => ($compact ? 0 : 1)};
  flex-wrap: ${({ $compact }) => ($compact ? 'nowrap' : 'wrap')};
  /* Split on purpose: the two-value shorthand is not parsed here, and the
     column gap silently went missing. */
  row-gap: 4px;
  column-gap: 12px;
`;

const Fact = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

const Label = styled.Text<{ $color: string; $strong?: boolean }>`
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  font-weight: ${({ $strong }) => ($strong ? 700 : 500)};
  color: ${({ $color }) => $color};
`;
