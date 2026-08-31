import Animated, { FadeIn } from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { focusMinutesFor } from '../../domain/FocusSession';
import type { Task } from '../../domain/Task';
import type { ListColor, ProjectIcon } from '../../domain/TaskList';
import type { TaskCopy } from '../localization/taskCopy';
import { describeTask, taskFacts } from '../models/taskMeta';
import { PriorityGlyph } from './FieldGlyphs';
import { PressableScale } from './PressableScale';
import { TaskCheckbox } from './TaskCheckbox';

interface AgoraCardProps {
  copy: TaskCopy;
  tasks: readonly Task[];
  nowMs: number;
  listOf: (task: Task) => {
    name: string | null;
    color: ListColor | null;
    icon: ProjectIcon | null;
  };
  onToggle: (taskId: string) => void;
  /** Starts the block right away, at the duration the card shows. */
  onFocus: (task: Task) => void;
  /** Opens the focus screen on this task with the duration open for editing,
   * without starting anything. */
  onChooseDuration: (task: Task) => void;
  /** Sends the reader to the rest of today instead of growing the band. */
  onShowRest: () => void;
}

/**
 * The first thing the tab shows: one task, and the two ways to start it.
 *
 * It used to be a card holding three tasks, which made it a short list rather
 * than a decision — three choices is still choosing. One task, on a band of
 * brand yellow that runs edge to edge, is the only thing on the screen that
 * cannot be scrolled past without being read.
 *
 * Everything written on the yellow is Ink. Hierarchy inside the band comes
 * from size and weight; a lighter ink on this ground drops to 4.6:1 and is the
 * exact mistake the rule exists to prevent.
 */
export function AgoraCard({
  copy,
  tasks,
  nowMs,
  listOf,
  onToggle,
  onFocus,
  onChooseDuration,
  onShowRest,
}: AgoraCardProps) {
  const theme = useTheme();
  const task = tasks[0];
  const hidden = Math.max(0, tasks.length - 1);

  if (task == null) return null;

  const list = listOf(task);
  const facts = taskFacts(task, nowMs, copy, list.name);
  const minutes = focusMinutesFor(task.estimatedMinutes);

  return (
    <Band entering={FadeIn.duration(220)}>
      <TopLine>
        <Eyebrow>{copy.today.agora}</Eyebrow>
        {hidden > 0 ? (
          <MoreButton
            accessibilityLabel={copy.today.agoraMore(hidden)}
            hitSlop={8}
            onPress={onShowRest}
            scaleTo={0.96}
            testID="agora-more"
          >
            <MoreLabel>{copy.today.agoraMore(hidden)}</MoreLabel>
          </MoreButton>
        ) : null}
      </TopLine>

      <Title numberOfLines={2}>{task.title}</Title>

      {/* One sentence, one glyph. Inside a yellow band a coloured glyph per
          fact has nowhere left to vary, so only the priority rule stays. */}
      <FactLine>
        <PriorityGlyph
          color={theme.colors.onAccent}
          level={facts.priority.level}
          size={13}
        />
        <FactText>{describeTask(facts)}</FactText>
      </FactLine>

      <Actions>
        {/* Two controls, two outcomes. The wide one commits to the block as
            shown; the small one is how you argue with the number first. When
            both started the same session, one of them was decoration. */}
        <DoNow
          accessibilityLabel={copy.today.focusFor(minutes, task.title)}
          onPress={() => onFocus(task)}
          scaleTo={0.97}
          testID="agora-do-now"
        >
          <DoNowText>{copy.today.doNow}</DoNowText>
        </DoNow>

        <TimeBlock
          accessibilityLabel={copy.today.changeDuration(minutes)}
          onPress={() => onChooseDuration(task)}
          scaleTo={0.94}
          testID="agora-focus"
        >
          <TimeValue>{minutes}</TimeValue>
          <TimeUnit>{copy.today.minutesUnit}</TimeUnit>
        </TimeBlock>

        <Done>
          <TaskCheckbox
            accessibilityLabel={task.title}
            checked={false}
            hitSlop={11}
            onToggle={() => onToggle(task.id)}
            testID={`task-checkbox-${task.id}`}
          />
        </Done>
      </Actions>
    </Band>
  );
}

/**
 * Runs past the screen padding and puts it back inside.
 *
 * Measuring the window instead would break on an Android with a side bar,
 * where the usable width is not the screen width.
 */
const Band = styled(Animated.View)`
  margin: ${({ theme }) => theme.spacing.medium}px -${({ theme }) =>
      theme.spacing.large}px 0px;
  padding: ${({ theme }) => theme.spacing.medium + 2}px
    ${({ theme }) => theme.spacing.large}px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const TopLine = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

const Eyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 1.8px;
  text-transform: uppercase;
`;

const MoreButton = styled(PressableScale)`
  min-height: 32px;
  justify-content: center;
`;

const MoreLabel = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 600;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.title}px;
  font-weight: 800;
  letter-spacing: -1px;
  line-height: ${({ theme }) => theme.type.title + 4}px;
  margin-top: ${({ theme }) => theme.spacing.small + 3}px;
`;

const FactLine = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small + 4}px;
  margin-top: ${({ theme }) => theme.spacing.small + 4}px;
`;

const FactText = styled.Text`
  flex-shrink: 1;
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  font-weight: 600;
`;

const Actions = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small + 1}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

/** Ink filled with Sol text: the one inversion in the app, and it belongs to
 * the one button that decides something. */
const DoNow = styled(PressableScale)`
  flex: 1;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.onAccent};
`;

const DoNowText = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;

const TimeBlock = styled(PressableScale)`
  width: 58px;
  height: 52px;
  align-items: center;
  justify-content: center;
  border: 1.5px solid ${({ theme }) => theme.colors.onAccent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
`;

const TimeValue = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 800;
`;

const TimeUnit = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 700;
`;

const Done = styled.View`
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
`;
