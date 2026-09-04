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
}

/**
 * "Nothing due today" while the list still holds work — never the same
 * picture as "nothing written down at all". A checkmark and a real next
 * task tell the difference at a glance, without a word of blame.
 */
export function CaughtUpCard({ copy, nextTaskTitle }: CaughtUpCardProps) {
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
      {/* "Ver tudo" sat here promising the rest of the list and only
          folded the filter strip away. A card that reports a state does not
          need a control at all: the tasks are one scroll below it. */}
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
  /* One step of the scale under whatever precedes it — the filter strip, most
     days. The distance lives here, on the card itself, with no wrapper in
     between to add a second one. */
  margin-top: ${({ theme }) => theme.spacing.medium}px;
  /* The card's own ceiling was the empty band people were reading as a gap:
     between the filter strip and the first word sat a step of margin, a step
     and a half of padding and a 44pt disc. The padding comes down to the same
     step as the margin. */
  padding: ${({ theme }) => theme.spacing.medium}px
    ${({ theme }) => theme.spacing.large}px
    ${({ theme }) => theme.spacing.large}px;
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
      ? theme.colors.cardNeutral
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

/* Bold text alone read as a sentence, not as something to press. An outlined
   pill says "control" without the solid fill that belongs to the capture
   button. */
const ViewAll = styled(PressableScale)`
  align-self: flex-start;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  padding: 0px 14px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const ViewAllLabel = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;
