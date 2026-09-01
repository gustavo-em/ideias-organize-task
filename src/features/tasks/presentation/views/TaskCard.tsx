import { useState } from 'react';
import { type TextLayoutEvent } from 'react-native';
import Animated, {
  FadeInDown,
  LinearTransition,
  SlideOutLeft,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { useRenderCount } from '../../../../app/perf/sheetPerf';
import { isCompleted, type Task } from '../../domain/Task';
import type { ListColor, ListMember, ProjectIcon } from '../../domain/TaskList';
import { STAGGER_MS } from '../animation/motion';
import type { TaskCopy } from '../localization/taskCopy';
import { describeTask, taskFacts } from '../models/taskMeta';
import { ChevronGlyph, TrashGlyph } from './FieldGlyphs';
import { MemberChip } from './MemberChip';
import { PressableScale } from './PressableScale';
import { TaskCheckbox } from './TaskCheckbox';
import { TaskFacts } from './TaskFacts';

interface TaskCardProps {
  task: Task;
  copy: TaskCopy;
  listName: string | null;
  listColor: ListColor | null;
  listIcon: ProjectIcon | null;
  nowMs: number;
  index: number;
  onToggle: () => void;
  /** Asks the screen to confirm; the card never deletes on its own. */
  onDelete?: () => void;
  onEdit?: () => void;
  /** Sits on the second line, on the right. */
  action?: { label: string; onPress: () => void; disabled?: boolean };
  /** Used in the deadline view, where each task should read in one pass. */
  compact?: boolean;
  /** A `viewer` in a shared project sees the task but cannot act on it. */
  disabled?: boolean;
  /** Who closed it, in a shared project. Takes the action slot's place once
   * the task is done — nobody owns an open task, but someone finished it. */
  completedByMember?: ListMember | null;
}

/** Longer than this and the title is cut, with the rest one tap away. */
const COLLAPSED_LINES = 2;

/**
 * One task, in two lines.
 *
 * The title and everything you can do to it share the top line; the facts and
 * the timer share the one below. Two lines rather than three is what lets a
 * screenful hold five or six tasks instead of three.
 *
 * Touching the task edits it, while delete remains a deliberate visible action.
 * The only extra control is the caret, and it appears only when there is
 * folded title text to reveal.
 */
export function TaskCard({
  task,
  copy,
  listName,
  listColor,
  listIcon,
  nowMs,
  index,
  onToggle,
  onDelete,
  onEdit,
  action,
  compact = false,
  disabled = false,
  completedByMember = null,
}: TaskCardProps) {
  const theme = useTheme();
  useRenderCount('TaskCard');
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);
  const done = isCompleted(task);
  const facts = taskFacts(task, nowMs, copy, listName);

  /**
   * Whether the title had to be cut.
   *
   * The laid-out lines only carry what is on screen, so a title that fits
   * comes back whole and a cut one comes back shorter. Comparing the two is
   * cheaper and steadier than measuring the text twice.
   */
  function measureTitle(event: TextLayoutEvent) {
    if (expanded) return;

    const shown = event.nativeEvent.lines
      .map(line => line.text)
      .join('')
      .replace(/…\s*$/, '')
      .trimEnd();
    const isClipped = shown.length < task.title.trimEnd().length;

    if (isClipped !== clipped) setClipped(isClipped);
  }

  return (
    <Shell
      entering={FadeInDown.delay(index * STAGGER_MS).duration(280)}
      exiting={SlideOutLeft.duration(240)}
      layout={LinearTransition.springify().damping(20).stiffness(200)}
    >
      <Card $done={done}>
        <TopLine>
          <TaskCheckbox
            accessibilityLabel={task.title}
            checked={done}
            disabled={disabled}
            onToggle={onToggle}
            testID={`task-checkbox-${task.id}`}
          />
          <TaskMain
            accessibilityLabel={`${task.title}. ${describeTask(facts)}`}
            accessibilityRole="button"
            disabled={onEdit == null}
            onPress={onEdit}
            scaleTo={0.99}
            testID={`task-${task.id}`}
          >
            <Body>
              <Title
                $done={done}
                numberOfLines={
                  expanded ? undefined : compact ? 1 : COLLAPSED_LINES
                }
                onTextLayout={measureTitle}
              >
                {task.title}
              </Title>
            </Body>

            {/* In the compact view the caret belongs to the title, rather than
                the action group. It takes no space until it is useful. */}
            {compact && clipped ? (
              <InlineExpandButton
                accessibilityLabel={
                  expanded ? copy.today.collapse : copy.today.expand
                }
                accessibilityState={{ expanded }}
                hitSlop={8}
                onPress={() => setExpanded(open => !open)}
                scaleTo={0.84}
                testID={`task-expand-${task.id}`}
              >
                <ChevronGlyph
                  color={theme.colors.mutedStrong}
                  size={18}
                  up={expanded}
                />
              </InlineExpandButton>
            ) : null}

            {compact ? (
              <TaskFacts
                compact
                dimmed={done}
                facts={facts}
                listColor={listColor}
                listIcon={listIcon}
              />
            ) : null}
          </TaskMain>

          <Controls>
            {onDelete == null ? null : (
              <IconButton
                accessibilityLabel={copy.today.remove}
                hitSlop={6}
                onPress={onDelete}
                scaleTo={0.84}
                testID={`task-delete-${task.id}`}
              >
                <TrashGlyph color={theme.colors.mutedStrong} size={18} />
              </IconButton>
            )}
            {compact || !clipped ? null : (
              <IconButton
                accessibilityLabel={
                  expanded ? copy.today.collapse : copy.today.expand
                }
                accessibilityState={{ expanded }}
                hitSlop={4}
                onPress={() => setExpanded(open => !open)}
                scaleTo={0.84}
                testID={`task-expand-${task.id}`}
              >
                <ChevronGlyph
                  color={theme.colors.mutedStrong}
                  size={18}
                  up={expanded}
                />
              </IconButton>
            )}
          </Controls>
        </TopLine>

        {compact ? null : (
          <BottomLine>
            <TaskFacts
              dimmed={done}
              facts={facts}
              listColor={listColor}
              listIcon={listIcon}
            />
            {completedByMember != null ? (
              <MemberChip
                accessibilityLabel={copy.lists.completedBy(
                  completedByMember.name,
                )}
                name={completedByMember.name}
                personId={completedByMember.personId}
                size="medium"
              />
            ) : action == null ? null : (
              <Action
                accessibilityLabel={action.label}
                disabled={action.disabled}
                onPress={action.onPress}
              >
                <ActionText>{action.label}</ActionText>
              </Action>
            )}
          </BottomLine>
        )}
      </Card>
    </Shell>
  );
}

/**
 * Enters from below, leaves to the left, and slides up when the card above it
 * goes away.
 *
 * The layout transition was impossible while anything inside declared a static
 * opacity — Reanimated warns that it may overwrite exactly that property. A
 * finished task now fades by colour instead, which freed the reflow and reads
 * better anyway.
 */
const Shell = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.small - 2}px;
`;

const Card = styled.View<{ $done: boolean }>`
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  padding: ${({ theme }) => theme.spacing.small + 3}px
    ${({ theme }) => theme.spacing.small + 4}px;
  /* A card that only differs from the page by four per cent of white does not
     read as a card. The lift is what puts it on the paper. */
  elevation: ${({ $done }) => ($done ? 0 : 2)};
  shadow-color: #1b1710;
  shadow-opacity: ${({ theme, $done }) =>
    theme.mode === 'dark' || $done ? 0 : 0.07};
  shadow-radius: 10px;
  shadow-offset: 0px 3px;
  background-color: ${({ theme, $done }) =>
    $done ? theme.colors.background : theme.colors.card};
`;

const TopLine = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small + 2}px;
`;

const Body = styled.View`
  flex: 1;
  flex-shrink: 1;
  min-width: 0px;
`;

/** Keeps task information separate from the fixed action buttons. */
const TaskMain = styled(PressableScale)`
  flex: 1;
  flex-direction: row;
  flex-shrink: 1;
  align-items: center;
  min-width: 0px;
  gap: ${({ theme }) => theme.spacing.small - 2}px;
`;

const Title = styled.Text<{ $done: boolean }>`
  color: ${({ theme, $done }) =>
    $done ? theme.colors.muted : theme.colors.text};
  font-size: ${({ theme }) => theme.type.body + 1}px;
  font-weight: 700;
  letter-spacing: -0.3px;
  line-height: ${({ theme }) => theme.type.body + 6}px;
  text-decoration-line: ${({ $done }) => ($done ? 'line-through' : 'none')};
`;

const Controls = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 2px;
  margin-left: ${({ theme }) => theme.spacing.small + 4}px;
  margin-right: -5px;
`;

const IconButton = styled(PressableScale)`
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.pill}px;
`;

const InlineExpandButton = styled(PressableScale)`
  width: 32px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.pill}px;
`;

/** Lines up under the title rather than under the checkbox. */
const BottomLine = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: 2px;
  margin-left: ${({ theme }) => 26 + theme.spacing.small + 2}px;
`;

const Action = styled(PressableScale)`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  padding: 5px 11px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const ActionText = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
`;
