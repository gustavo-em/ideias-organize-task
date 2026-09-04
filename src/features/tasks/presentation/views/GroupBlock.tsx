import { memo, useCallback } from 'react';
import Animated from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { rowEnter } from '../../../../app/animation/motion';
import {
  daysUntilEvent,
  groupProgress,
  type TaskGroup,
} from '../../domain/TaskGroup';
import type { Task } from '../../domain/Task';
import type { ListMember } from '../../domain/TaskList';
import type { AppLanguage, TaskCopy } from '../localization/taskCopy';
import { formatDateLabel } from '../models/dateLabel';
import { groupDateLine } from '../models/groupSections';
import {
  projectBadgeInk,
  projectInk,
  projectTint,
  projectTone,
} from '../models/projectAppearance';
import { CheckGlyph, ChevronGlyph, ProjectGlyph } from './FieldGlyphs';
import { MemberStack } from './MemberStack';
import { PressableScale } from './PressableScale';

interface GroupBlockProps {
  copy: TaskCopy;
  group: TaskGroup;
  index: number;
  language: AppLanguage;
  /** Every task of the space; the block counts only its own. */
  tasks: readonly Task[];
  nowMs: number;
  /** Who is in the space, or empty when it is only yours. */
  members: readonly ListMember[];
  onOpen: (group: TaskGroup) => void;
}

/**
 * A group, as it reads inside its space.
 *
 * Form is what separates a group from a task, not a label: a task is a bare
 * line — box, title, one fact — and a group is a tinted block with a square,
 * a name, the date of what it is about and a bar for the whole set. Nobody has
 * to read a word to know which is which.
 *
 * There is no border and no shadow on it. The tint is the whole device: a
 * block that is both tinted and outlined reads as a card that failed to load.
 */
export const GroupBlock = memo(function GroupBlockView({
  copy,
  group,
  index,
  language,
  tasks,
  nowMs,
  members,
  onOpen,
}: GroupBlockProps) {
  const theme = useTheme();
  const words = copy.lists.groups;
  const { done, total } = groupProgress(tasks, group.id);
  const days = daysUntilEvent(group, nowMs);
  const ink = projectInk(theme, group.color);
  const tone = projectTone(theme, group.color);
  const complete = total > 0 && done === total;
  const dateLine = groupDateLine(
    group,
    nowMs,
    copy,
    atMs => formatDateLabel(atMs, language, nowMs),
    days,
  );
  const handleOpen = useCallback(() => onOpen(group), [group, onOpen]);

  return (
    <Shell entering={rowEnter(index)}>
      <Block
        $tint={projectTint(theme, group.color)}
        accessibilityLabel={`${words.open(group.name)}. ${dateLine}. ${
          complete ? words.allDone : words.progress(done, total)
        }`}
        accessibilityRole="button"
        onPress={handleOpen}
        scaleTo={0.99}
        testID={`group-${group.id}`}
      >
        <Head>
          <Badge $tone={tone}>
            <ProjectGlyph
              color={projectBadgeInk(theme, group.color)}
              icon={group.icon}
              size={20}
            />
          </Badge>
          <Texts>
            <Name numberOfLines={1}>{group.name}</Name>
            <DateLine $ink={ink} numberOfLines={1}>
              {dateLine}
            </DateLine>
          </Texts>
          <ChevronGlyph color={ink} size={16} />
        </Head>

        {total === 0 ? null : complete ? (
          <DoneRow>
            <CheckGlyph color={ink} size={14} />
            <Progress $ink={ink}>{words.allDone}</Progress>
          </DoneRow>
        ) : (
          <BarRow>
            <Track>
              <Fill
                $tone={tone}
                $width={`${Math.round((done / total) * 100)}%`}
              />
            </Track>
            <Progress $ink={ink}>{words.progress(done, total)}</Progress>
          </BarRow>
        )}

        {members.length <= 1 ? null : (
          <People>
            <MemberStack
              members={members}
              sharedWithLabel={copy.lists.sharedWith(members.length)}
              size="row"
            />
          </People>
        )}
      </Block>
    </Shell>
  );
});

/* Radius 20 and padding 14, the same block for every group. The tint is the
   colour at 12% of itself, from the helper the spaces already use. */
const Shell = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.small + 2}px;
`;

const Block = styled(PressableScale)<{ $tint: string }>`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radii.large}px;
  background-color: ${({ $tint }) => $tint};
`;

const Head = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small + 4}px;
`;

/* The square is filled with the pure colour, not with the wash: the icon is
   the group's identity and has to hold its own against the block it sits on. */
const Badge = styled.View<{ $tone: string }>`
  width: 38px;
  height: 38px;
  border-radius: 13px;
  align-items: center;
  justify-content: center;
  background-color: ${({ $tone }) => $tone};
`;

const Texts = styled.View`
  flex: 1;
  min-width: 0px;
`;

const Name = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.heading - 2}px;
  font-weight: 800;
  letter-spacing: -0.4px;
`;

/* Never the pure colour: at 12% as a ground it does not carry caption text. */
const DateLine = styled.Text<{ $ink: string }>`
  color: ${({ $ink }) => $ink};
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  font-weight: 600;
  margin-top: 3px;
`;

const BarRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small + 2}px;
  margin-top: 14px;
`;

const DoneRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.tiny + 2}px;
  margin-top: 14px;
`;

/* Paper under the fill, so the bar is read on the tinted block instead of
   dissolving into it. */
const Track = styled.View`
  flex: 1;
  height: 5px;
  border-radius: 3px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.card};
`;

const Fill = styled.View<{ $tone: string; $width: string }>`
  width: ${({ $width }) => $width};
  height: 5px;
  border-radius: 3px;
  background-color: ${({ $tone }) => $tone};
`;

/* The bar measures the set of tasks, never the people: there is no progress
   per person anywhere in a group. */
const Progress = styled.Text<{ $ink: string }>`
  color: ${({ $ink }) => $ink};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 600;
`;

const People = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 12px;
`;
