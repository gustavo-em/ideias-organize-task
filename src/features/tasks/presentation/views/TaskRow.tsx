import Animated from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { useRenderCount } from '../../../../app/perf/sheetPerf';
import { daysBetween } from '../../domain/Day';
import { isCompleted, taskWeight, type Task } from '../../domain/Task';
import type { ListColor, ProjectIcon } from '../../domain/TaskList';
import { rowEnter, rowExit, rowLayout } from '../../../../app/animation/motion';
import type { TaskCopy } from '../localization/taskCopy';
import type { HomeGrouping } from '../models/homeSections';
import { rowFact } from '../models/rowFact';
import { projectTone } from '../models/projectAppearance';
import { describeTask, taskFacts } from '../models/taskMeta';
import { ProjectGlyph } from './FieldGlyphs';
import { FocusDot, focusStatusText, minutesLeft } from './FocusDot';
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
  onToggle: () => void;
  onEdit?: () => void;
  /** Present only on the task a focus block is running on. The row then leads
   * to the session instead of to the edit sheet. */
  focus?: FocusRowState;
}

export interface FocusRowState {
  /** mm:ss, already counted by the focus view model. */
  label: string;
  phase: 'running' | 'paused' | 'finished';
  onOpen: () => void;
}

/**
 * One task, one line.
 *
 * The card was a container drawn around content that never needed containing:
 * a border, a radius, a shadow and 24px of padding spent per task, so a
 * screenful held five. Without the box the same screen holds nine, and the
 * separation the box was providing is done by air alone. The only rule left
 * on the screen belongs to the section heading: a line between every pair of
 * tasks turns a list into a table, and a table is read cell by cell.
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
  onToggle,
  onEdit,
  focus,
}: TaskRowProps) {
  useRenderCount('TaskRow');
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

  return (
    <Row entering={rowEnter(index)} exiting={rowExit()} layout={rowLayout()}>
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
        accessibilityHint={focus == null ? undefined : copy.focus.openSession}
        accessibilityLabel={
          focus == null
            ? `${task.title}. ${describeTask(facts)}`
            : `${task.title}. ${focusStatusText(focus.phase, copy)}.`
        }
        accessibilityRole="button"
        /* The clock is a value, not a name: a label that changes every second
           makes a screen reader re-read the whole row every second. */
        accessibilityValue={
          focus == null
            ? undefined
            : { text: copy.capture.minutes(minutesLeft(focus.label)) }
        }
        disabled={focus == null && onEdit == null}
        onPress={focus == null ? onEdit : focus.onOpen}
        scaleTo={0.99}
        testID={`task-${task.id}`}
      >
        {/* No priority mark next to the title. A coloured meter beside every
            sentence turned the list into a field of marks competing with the
            words; priority still reaches a screen reader through the label,
            and the priority lens groups by it when it is what matters. */}
        <Title $done={done} numberOfLines={1}>
          {task.title}
        </Title>

        {/* Steps done out of steps written, in the quietest ink on the row.
            The spoken label already carries it, so the digits are decoration
            for the eye and never a second thing to read out. */}
        {facts.subtasks == null ? null : (
          <SubtaskCount
            accessibilityElementsHidden
            importantForAccessibility="no"
            testID={`task-subtasks-${task.id}`}
          >
            {`${facts.subtasks.done}/${facts.subtasks.total}`}
          </SubtaskCount>
        )}
      </Main>

      {done ? (
        <Earned testID={`task-earned-${task.id}`}>
          {copy.today.earned(taskWeight(task))}
        </Earned>
      ) : focus != null ? (
        <FocusPill
          copy={copy}
          label={focus.label}
          phase={focus.phase}
          testID={`task-focus-${task.id}`}
        />
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

/** The block, shown where the fact used to be. */
function FocusPill({
  copy,
  label,
  phase,
  testID,
}: {
  copy: TaskCopy;
  label: string;
  phase: FocusRowState['phase'];
  testID: string;
}) {
  return (
    <Pill pointerEvents="none" testID={testID}>
      <FocusDot phase={phase} />
      {phase === 'running' ? null : (
        <PillStatus>{focusStatusText(phase, copy)}</PillStatus>
      )}
      <PillTime $done={phase === 'finished'}>{label}</PillTime>
    </Pill>
  );
}

/**
 * A finished row fades by colour, never by opacity: a static opacity is the
 * one property a layout animation may overwrite, and Reanimated warns about
 * it once per row.
 */
const Row = styled(Animated.View)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small + 5}px;
  padding: ${({ theme }) => theme.spacing.medium - 1}px 0px;
`;

const Main = styled(PressableScale)`
  flex: 1;
  flex-direction: row;
  align-items: center;
  min-width: 0px;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

/* Sits with the title rather than in the right-hand slot, which the project
   name and the timer already own. Never shrinks: four characters. */
const SubtaskCount = styled.Text`
  flex-shrink: 0;
  margin-left: 8px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 700;
  font-variant: tabular-nums;
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
  /* Lateness is not danger: the danger colour belongs to the destructive
     action alone. Emphasis reads through ink and weight, never through alarm. */
  color: ${({ theme, $tone }) =>
    $tone === 'danger' ? theme.colors.text : theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption + 0.5}px;
  font-weight: ${({ $weight }) => $weight};
`;

/* A chip, not a card: no border and no shadow, so the list keeps its air. */
const Pill = styled.View`
  flex-shrink: 0;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  padding: 4px 10px;
`;

const PillStatus = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 600;
`;

/* Tabular figures: a clock that changes width every second reads as a glitch. */
const PillTime = styled.Text.attrs({
  style: { fontVariant: ['tabular-nums' as const] },
})<{ $done: boolean }>`
  color: ${({ theme, $done }) =>
    $done ? theme.colors.successInk : theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.caption + 0.5}px;
  font-weight: 800;
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
