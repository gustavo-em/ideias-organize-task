import Animated from 'react-native-reanimated';

import { contentEnter } from '../../../../app/animation/motion';
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
    <Card entering={contentEnter(0)}>
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
    <Card entering={contentEnter(0)}>
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

// Calm, neutral ground: the accent yellow stays owned by the floating
// capture button, so this card never competes with it for attention.
const Card = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.small}px;
  padding: ${({ theme }) => theme.spacing.large}px;
  border-radius: ${({ theme }) => theme.radii.large}px;
  background-color: ${({ theme }) => theme.colors.card};
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  /* Same lift as TaskCard: without it the card only differs from the page
     by a few per cent of white and reads as flat, not as a surface. */
  elevation: 2;
  shadow-color: #1b1710;
  shadow-opacity: ${({ theme }) => (theme.mode === 'dark' ? 0 : 0.07)};
  shadow-radius: 10px;
  shadow-offset: 0px 3px;
`;

const IconWrap = styled.View<{ $tone?: 'accent' }>`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  margin-bottom: ${({ theme }) => theme.spacing.small}px;
  /* The invitation (never written anything down) borrows the brand's own
     surface; the confirmation (caught up) gets a quiet tint of its own
     success colour, so the two states read as distinct pictures. */
  background-color: ${({ theme, $tone }) =>
    $tone === 'accent'
      ? theme.colors.cardElevated
      : `${theme.colors.success}26`};
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
