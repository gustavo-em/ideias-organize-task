import Animated, { FadeIn } from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import type { TaskCopy } from '../localization/taskCopy';
import { CheckGlyph, ProjectGlyph } from './FieldGlyphs';
import { PressableScale } from './PressableScale';

interface CaughtUpCardProps {
  copy: TaskCopy;
  /** Title of the next open task, or null when nothing is open at all. */
  nextTaskTitle: string | null;
  onViewAll: () => void;
}

/**
 * "Nothing due today" while the list still holds work — never the same
 * picture as "nothing written down at all". A checkmark and a real next
 * task tell the difference at a glance, without a word of blame.
 */
export function CaughtUpCard({
  copy,
  nextTaskTitle,
  onViewAll,
}: CaughtUpCardProps) {
  const theme = useTheme();

  return (
    <Card entering={FadeIn.duration(220)}>
      <IconWrap>
        <CheckGlyph color={theme.colors.success} size={22} />
      </IconWrap>
      <Title>{copy.today.caughtUpTitle}</Title>
      <Body>
        {nextTaskTitle == null
          ? copy.today.caughtUpAllDone
          : copy.today.caughtUpNext(nextTaskTitle)}
      </Body>
      {nextTaskTitle == null ? null : (
        <ViewAll
          accessibilityLabel={copy.today.caughtUpViewAll}
          onPress={onViewAll}
          scaleTo={0.98}
        >
          <ViewAllLabel>{copy.today.caughtUpViewAll}</ViewAllLabel>
        </ViewAll>
      )}
    </Card>
  );
}

interface EmptyStateCardProps {
  copy: TaskCopy;
  onCapture: () => void;
}

/**
 * Nothing has ever been written down. A different picture from being caught
 * up: an invitation forward, not a report on a debt that never existed.
 */
export function EmptyStateCard({ copy, onCapture }: EmptyStateCardProps) {
  const theme = useTheme();

  return (
    <Card entering={FadeIn.duration(220)}>
      <IconWrap $tone="accent">
        <ProjectGlyph color={theme.colors.accentInk} icon="inbox" size={22} />
      </IconWrap>
      <Title>{copy.today.empty}</Title>
      <Body>{copy.today.emptyHint}</Body>
      <ViewAll
        accessibilityLabel={copy.today.capture}
        onPress={onCapture}
        scaleTo={0.98}
      >
        <ViewAllLabel>{copy.today.capture}</ViewAllLabel>
      </ViewAll>
    </Card>
  );
}

const Card = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.medium}px;
  padding: ${({ theme }) => theme.spacing.large}px;
  border-radius: ${({ theme }) => theme.radii.large}px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
`;

const IconWrap = styled.View<{ $tone?: 'accent' }>`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  margin-bottom: ${({ theme }) => theme.spacing.small}px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.heading}px;
  font-weight: 800;
  letter-spacing: -0.3px;
`;

const Body = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.body}px;
  line-height: 22px;
  margin-top: 4px;
`;

const ViewAll = styled(PressableScale)`
  align-self: flex-start;
  min-height: 44px;
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const ViewAllLabel = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;
