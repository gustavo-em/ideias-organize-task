import Animated, {
  FadeInDown,
  LinearTransition,
  SlideOutLeft,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { daysBetween } from '../../domain/Day';
import { isCompleted, taskWeight, type Task } from '../../domain/Task';
import type { ListColor, ProjectIcon } from '../../domain/TaskList';
import { STAGGER_MS } from '../animation/motion';
import type { TaskCopy } from '../localization/taskCopy';
import type { HomeGrouping } from '../models/homeSections';
import { rowFact } from '../models/rowFact';
import { projectTone } from '../models/projectAppearance';
import { describeTask, taskFacts } from '../models/taskMeta';
import { PriorityGlyph, ProjectGlyph } from './FieldGlyphs';
import { PressableScale } from './PressableScale';
import { TaskCheckbox } from './TaskCheckbox';

interface TaskRowProps {
  task: Task;
  copy: TaskCopy;
  listName: string | null;
  listColor: ListColor | null;
  listIcon: ProjectIcon | null;
  nowMs: number;
  index: number;
  /** The lens the list is grouped by, so the row never repeats its heading. */
  lens: HomeGrouping;
  sectionId: string;
  /** The last row of a section carries no rule: the gap below ends it. */
  isLast: boolean;
  onToggle: () => void;
  onEdit?: () => void;
}

/**
 * One task, one line.
 *
 * The card was a container drawn around content that never needed containing:
 * a border, a radius, a shadow and 24px of padding spent per task, so a
 * screenful held five. Without the box the same screen holds nine, and the
 * separation the box was providing is done by a hairline and by air.
 *
 * Deleting moved out of the row. A destructive control repeated once per task
 * is a target you hit by accident while scrolling; it lives in the edit sheet
 * that a tap already opens.
 */
export function TaskRow({
  task,
  copy,
  listName,
  listColor,
  listIcon,
  nowMs,
  index,
  lens,
  sectionId,
  isLast,
  onToggle,
  onEdit,
}: TaskRowProps) {
  const theme = useTheme();
  const done = isCompleted(task);
  const facts = taskFacts(task, nowMs, copy, listName);
  const fact = rowFact({
    facts,
    lens,
    sectionId,
    estimatedMinutes: task.estimatedMinutes,
    lateDays: task.dueAtMs == null ? 0 : daysBetween(task.dueAtMs, nowMs),
    copy,
    listColor,
    listIcon,
  });
  // The rule groups the section; under the priority lens the heading already
  // says the level, so the glyph would repeat it.
  const showsPriority =
    !done && lens !== 'priority' && facts.priority.level >= 2;

  return (
    <Row
      $last={isLast}
      entering={FadeInDown.delay(index * STAGGER_MS).duration(280)}
      exiting={SlideOutLeft.duration(240)}
      layout={LinearTransition.springify().damping(20).stiffness(200)}
    >
      <TaskCheckbox
        accessibilityLabel={task.title}
        checked={done}
        // 26px drawn, 48px real. The slop stays inside the gap before the
        // title, so it never swallows a tap meant for the task.
        hitSlop={11}
        onToggle={onToggle}
        testID={`task-checkbox-${task.id}`}
      />

      <Main
        accessibilityLabel={`${task.title}. ${describeTask(facts)}`}
        accessibilityRole="button"
        disabled={onEdit == null}
        onPress={onEdit}
        scaleTo={0.99}
        testID={`task-${task.id}`}
      >
        <Title $done={done} numberOfLines={1}>
          {task.title}
        </Title>

        {showsPriority ? (
          <PriorityGlyph
            color={
              facts.priority.tone === 'danger'
                ? theme.colors.danger
                : theme.colors.accentInk
            }
            level={facts.priority.level}
            size={13}
          />
        ) : null}
      </Main>

      {done ? (
        <Earned testID={`task-earned-${task.id}`}>
          {copy.today.earned(taskWeight(task))}
        </Earned>
      ) : fact == null ? null : (
        <Fact>
          {fact.project?.icon == null || fact.project.color == null ? null : (
            <ProjectGlyph
              color={projectTone(theme, fact.project.color)}
              icon={fact.project.icon}
              size={12}
            />
          )}
          <FactText $tone={fact.tone} $weight={fact.weight}>
            {fact.text}
          </FactText>
        </Fact>
      )}
    </Row>
  );
}

/**
 * A finished row fades by colour, never by opacity: a static opacity is the
 * one property a layout animation may overwrite, and Reanimated warns about
 * it once per row.
 */
const Row = styled(Animated.View)<{ $last: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small + 5}px;
  padding: ${({ theme }) => theme.spacing.medium - 1}px 0px;
  border-bottom-width: ${({ $last }) => ($last ? 0 : 1)}px;
  border-bottom-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const Main = styled(PressableScale)`
  flex: 1;
  flex-direction: row;
  align-items: center;
  min-width: 0px;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

const Title = styled.Text<{ $done: boolean }>`
  flex-shrink: 1;
  color: ${({ theme, $done }) =>
    $done ? theme.colors.muted : theme.colors.text};
  font-size: ${({ theme }) => theme.type.body + 1}px;
  font-weight: 700;
  letter-spacing: -0.3px;
  text-decoration-line: ${({ $done }) => ($done ? 'line-through' : 'none')};
`;

const Fact = styled.View`
  flex-shrink: 0;
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.tiny + 1}px;
`;

const FactText = styled.Text<{
  $tone: 'danger' | 'mutedStrong';
  $weight: 500 | 600 | 700;
}>`
  color: ${({ theme, $tone }) =>
    $tone === 'danger' ? theme.colors.danger : theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption + 0.5}px;
  font-weight: ${({ $weight }) => $weight};
`;

/**
 * The only place in the product where "points come from weight" is visible at
 * the moment the weight is paid. It leaves with the row, on the exit that
 * already existed.
 */
const Earned = styled.Text`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.successInk};
  font-size: ${({ theme }) => theme.type.caption + 0.5}px;
  font-weight: 600;
`;
