import { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import styled from 'styled-components/native';

import type { Task } from '../../domain/Task';
import type { ListColor, ProjectIcon } from '../../domain/TaskList';
import type { TaskCopy } from '../localization/taskCopy';
import { PressableScale } from './PressableScale';
import { TaskCard } from './TaskCard';

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
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

/** How many of today's tasks show before the rest fold behind "+N hoje". */
const VISIBLE_CAP = 3;

/**
 * The first thing the tab shows: what is actionable today, capped small.
 *
 * The rest of what is open never appears before this card — it is what turns
 * "the whole list" into "a decision", one glance in.
 */
export function AgoraCard({
  copy,
  tasks,
  nowMs,
  listOf,
  onToggle,
  onEdit,
  onDelete,
}: AgoraCardProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? tasks : tasks.slice(0, VISIBLE_CAP);
  const hidden = tasks.length - visible.length;

  return (
    <Card entering={FadeIn.duration(220)}>
      <Eyebrow>{copy.today.agora}</Eyebrow>

      {visible.map((task, index) => {
        const list = listOf(task);

        return (
          <TaskCard
            compact
            copy={copy}
            index={index}
            key={task.id}
            listColor={list.color}
            listIcon={list.icon}
            listName={list.name}
            nowMs={nowMs}
            onDelete={() => onDelete(task)}
            onEdit={() => onEdit(task)}
            onToggle={() => onToggle(task.id)}
            task={task}
          />
        );
      })}

      {hidden > 0 ? (
        <MoreButton
          accessibilityLabel={copy.today.agoraMore(hidden)}
          onPress={() => setExpanded(true)}
          scaleTo={0.98}
        >
          <MoreLabel>{copy.today.agoraMore(hidden)}</MoreLabel>
        </MoreButton>
      ) : null}
    </Card>
  );
}

const Card = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Eyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  margin-bottom: ${({ theme }) => theme.spacing.small}px;
`;

const MoreButton = styled(PressableScale)`
  min-height: 48px;
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.tiny}px;
`;

const MoreLabel = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;
