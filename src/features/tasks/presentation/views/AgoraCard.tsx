import Animated from 'react-native-reanimated';

import { contentEnter } from '../../../../app/animation/motion';
import {
  buttonTextAttrs,
  buttonTextMetrics,
} from '../../../../app/theme/buttonText';
import styled, { useTheme } from 'styled-components/native';

import type { Task } from '../../domain/Task';
import type { ListColor, ProjectIcon } from '../../domain/TaskList';
import type { TaskCopy } from '../localization/taskCopy';
import { describeTask, taskFacts } from '../models/taskMeta';
import { CheckGlyph, PlayGlyph, PriorityGlyph } from './FieldGlyphs';
import {
  FocusDot,
  focusStatusText,
  minutesLeft,
  type FocusPhase,
} from './FocusDot';
import { PressableScale } from './PressableScale';

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
  /** Opens the focus screen on this task with the duration ready to choose.
   * The band no longer decides how long the block is. */
  onChooseDuration?: (task: Task) => void;
  /** Present only when the band's task is the one a block is running on: the
   * action then leads back into the session instead of starting one. */
  focus?: {
    label: string;
    phase: FocusPhase;
    onOpen: () => void;
  };
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
  onChooseDuration,
  onShowRest,
  focus,
}: AgoraCardProps) {
  const theme = useTheme();
  const task = tasks[0];
  const hidden = Math.max(0, tasks.length - 1);

  if (task == null) return null;

  const list = listOf(task);
  const facts = taskFacts(task, nowMs, copy, list.name);

  return (
    <Band entering={contentEnter(0)}>
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
        {/* One control. The band used to show a duration next to it, which
            asked the reader to agree with a number before deciding anything;
            the length is now the first question on the focus screen, where
            changing it costs one tap. */}
        {/* Same slot, three lives: it starts a block, it carries the one that
            is running back to the session, and it is absent while a block is
            running on some other task. */}
        {focus != null ? (
          <InFocus
            accessibilityHint={copy.focus.openSession}
            accessibilityLabel={focusStatusText(focus.phase, copy)}
            accessibilityRole="button"
            accessibilityValue={{
              text: copy.capture.minutes(minutesLeft(focus.label)),
            }}
            onPress={focus.onOpen}
            scaleTo={0.97}
            testID="agora-focus"
          >
            <FocusDot phase={focus.phase} />
            {focus.phase === 'running' ? null : (
              <InFocusStatus>
                {focusStatusText(focus.phase, copy)}
              </InFocusStatus>
            )}
            <InFocusTime>{focus.label}</InFocusTime>
          </InFocus>
        ) : onChooseDuration == null ? null : (
          <DoNow
            /* The label says what happens to the task; the hint says what the
               next screen asks, because "focus" is a word this app never
               teaches anywhere the reader could have met it. */
            accessibilityHint={copy.focus.idleHint}
            accessibilityLabel={copy.today.doNowOn(task.title)}
            onPress={() => onChooseDuration(task)}
            scaleTo={0.97}
            testID="agora-do-now"
          >
            <PlayGlyph color={theme.colors.accent} size={14} />
            <DoNowText>{copy.today.doNow}</DoNowText>
          </DoNow>
        )}

        {/* An empty square said nothing about what tapping it would do. The
            same tap now arrives with its verb written on it, next to the
            verb of the other control, so the band offers two named choices
            instead of one button and a shape. */}
        <MarkDone
          accessibilityLabel={`${copy.today.markDone}: ${task.title}`}
          accessibilityRole="button"
          onPress={() => onToggle(task.id)}
          scaleTo={0.97}
          testID={`task-checkbox-${task.id}`}
        >
          <CheckGlyph color={theme.colors.onAccent} size={15} />
          <MarkDoneText>{copy.today.markDone}</MarkDoneText>
        </MarkDone>
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
  line-height: ${({ theme }) => Math.round(theme.type.title * 1.14)}px;
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
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.onAccent};
`;

/* The same ink slab the start button uses, so the band keeps one shape: what
   changes is what is written on it, not where the finger goes. */
const InFocus = styled(PressableScale)`
  flex: 1;
  min-height: 52px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.onAccent};
`;

const InFocusStatus = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 600;
`;

const InFocusTime = styled.Text.attrs({
  style: { fontVariant: ['tabular-nums' as const] },
})`
  color: ${({ theme }) => theme.colors.accent};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;

const DoNowText = styled.Text.attrs(buttonTextAttrs)`
  color: ${({ theme }) => theme.colors.accent};
  ${({ theme }) => buttonTextMetrics(theme.type.label + 1)}
  font-weight: 800;
`;

/* The second choice on the band: outlined in the same ink the words are
   written in, so it reads as a control without taking the one filled slab
   the starting action owns. It carries the same flex as that slab — sized to
   its own label it ended shorter than the button beside it, and the pair sat
   off the line the title and the fact are written on. */
const MarkDone = styled(PressableScale)`
  flex: 1;
  min-height: 52px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.small - 2}px;
  padding: 0px ${({ theme }) => theme.spacing.small}px;
  border-width: 2px;
  border-style: solid;
  border-color: ${({ theme }) => theme.colors.onAccent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
`;

const MarkDoneText = styled.Text.attrs(buttonTextAttrs)`
  color: ${({ theme }) => theme.colors.onAccent};
  ${({ theme }) => buttonTextMetrics(theme.type.label + 1)}
  font-weight: 800;
`;
