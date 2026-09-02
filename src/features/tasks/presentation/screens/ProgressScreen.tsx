import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { contentEnter } from '../../../../app/animation/motion';
import { startOfDay } from '../../domain/Day';
import type { TaskCopy } from '../localization/taskCopy';
import type { TasksViewModel } from '../view-models/useTasksViewModel';
import { BalanceRing } from '../views/BalanceRing';
import { CountUpText } from '../views/CountUpText';
import { HairlineRule } from '../views/HairlineRule';
import { ScreenHeader } from '../views/ScreenHeader';
import { StatMiniBars } from '../views/StatMiniBars';
import { StatProportion } from '../views/StatProportion';
import { WeekBars } from '../views/WeekBars';

interface ProgressScreenProps {
  copy: TaskCopy;
  viewModel: TasksViewModel;
}

/**
 * What the person has actually been doing.
 *
 * Everything here is counted from the tasks on this phone: what is still open,
 * what has been closed, when it was closed. The level is not the subject any
 * more — it sits in one quiet line at the bottom, because how far a scoring
 * curve has advanced is not what anyone came here to find out.
 */
export function ProgressScreen({ copy, viewModel }: ProgressScreenProps) {
  const theme = useTheme();
  const { activeProjects, balance, closedByDay, level, weekdayPattern } =
    viewModel;
  const todayMs = startOfDay(viewModel.nowMs);
  const closedThisWeek = closedByDay.reduce((sum, day) => sum + day.closed, 0);
  const bestWeekday = weekdayPattern.bestWeekday;
  const bestWeekdayName =
    bestWeekday == null ? null : copy.progress.weekdayNames[bestWeekday];

  return (
    <Content>
      <ScreenHeader
        eyebrow={copy.progress.eyebrow}
        subtitle={copy.progress.privacyHint}
        title={copy.progress.boardTitle}
      />

      <Block entering={contentEnter(0)}>
        <Heading>
          <HeadingLabel>{copy.progress.balanceLabel}</HeadingLabel>
          <HeadingCount>{balance.total}</HeadingCount>
          <HairlineRule />
        </Heading>

        <BalanceRow
          accessibilityLabel={copy.progress.balanceSummary(
            balance.open,
            balance.closed,
          )}
          accessibilityRole="summary"
          accessible
        >
          <RingHolder importantForAccessibility="no-hide-descendants">
            <BalanceRing fraction={balance.closedShare} />
            <RingCentre>
              <CountUpText
                style={[styles.ringValue, { color: theme.colors.text }]}
                suffix="%"
                testID="balance-share"
                value={Math.round(balance.closedShare * 100)}
              />
            </RingCentre>
          </RingHolder>

          <Figures importantForAccessibility="no-hide-descendants">
            <View>
              <CountUpText
                style={[styles.figureValue, { color: theme.colors.text }]}
                testID="balance-open"
                value={balance.open}
              />
              <FigureLabel>{copy.progress.open}</FigureLabel>
            </View>
            <View>
              <CountUpText
                style={[
                  styles.figureValue,
                  { color: theme.colors.mutedStrong },
                ]}
                testID="balance-closed"
                value={balance.closed}
              />
              <FigureLabel>{copy.progress.closed}</FigureLabel>
            </View>
          </Figures>
        </BalanceRow>
      </Block>

      <Block entering={contentEnter(1)}>
        <Heading>
          <HeadingLabel>{copy.progress.sevenDays}</HeadingLabel>
          <HeadingCount>{closedThisWeek}</HeadingCount>
          <HairlineRule />
        </Heading>

        <View
          accessibilityLabel={copy.progress.weekSummary(closedThisWeek)}
          accessibilityRole="summary"
          accessible
        >
          <View importantForAccessibility="no-hide-descendants">
            <WeekBars
              days={closedByDay}
              todayMs={todayMs}
              weekdays={copy.progress.weekdays}
            />
            <Note>
              <CountUpText
                style={[styles.noteValue, { color: theme.colors.mutedStrong }]}
                testID="week-closed"
                value={closedThisWeek}
              />
              <NoteLabel>
                {copy.progress.closedInWeek(closedThisWeek)}
              </NoteLabel>
            </Note>
          </View>
        </View>
      </Block>

      <Block entering={contentEnter(2)}>
        <Heading>
          <HeadingLabel>{copy.progress.patterns}</HeadingLabel>
          <HairlineRule />
        </Heading>

        <Patterns>
          <Pattern
            accessibilityLabel={
              bestWeekdayName == null
                ? `${copy.progress.bestWeekday}: ${copy.progress.noPatternYet}`
                : copy.progress.bestWeekdaySummary(
                    bestWeekdayName,
                    weekdayPattern.bestCount,
                  )
            }
            accessibilityRole="summary"
            accessible
          >
            <View importantForAccessibility="no-hide-descendants">
              <PatternLabel>{copy.progress.bestWeekday}</PatternLabel>
              <PatternValue $muted={bestWeekdayName == null}>
                {bestWeekdayName ?? '—'}
              </PatternValue>
              <StatMiniBars
                best={bestWeekday}
                labels={copy.progress.weekdays}
                values={weekdayPattern.byWeekday}
              />
              {bestWeekdayName == null ? (
                <PatternHint>{copy.progress.noPatternYet}</PatternHint>
              ) : null}
            </View>
          </Pattern>

          <Pattern
            accessibilityLabel={copy.progress.projectsSummary(
              activeProjects.active,
              activeProjects.total,
            )}
            accessibilityRole="summary"
            accessible
          >
            <View importantForAccessibility="no-hide-descendants">
              <PatternLabel>{copy.progress.activeProjects}</PatternLabel>
              <CountUpText
                style={[styles.patternValue, { color: theme.colors.text }]}
                testID="active-projects"
                value={activeProjects.active}
              />
              <StatProportion fraction={activeProjects.share} />
              <PatternHint>
                {copy.progress.activeProjectsOf(activeProjects.total)}
              </PatternHint>
            </View>
          </Pattern>
        </Patterns>
      </Block>

      <Footnote>
        {copy.progress.footnote(level.level, viewModel.streakDays)}
      </Footnote>
    </Content>
  );
}

/* Tabular figures everywhere a number appears: a count that shifts sideways as
   it counts up reads as a glitch, not as motion. */
const styles = StyleSheet.create({
  ringValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  figureValue: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  patternValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  noteValue: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});

/* The tab owns the scroll; this block only asks for the height it needs. */
const Content = styled.View`
  padding: 0px ${({ theme }) => theme.spacing.large}px
    ${({ theme }) => theme.spacing.large}px;
`;

/* No surface of its own: a block is grouped by its heading, its rule and the
   space around it, never by another box. */
const Block = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.large}px;
`;

const Heading = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  min-height: 24px;
`;

const HeadingLabel = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  font-weight: 800;
  letter-spacing: 0.4px;
  line-height: 17px;
  text-transform: uppercase;
`;

const HeadingCount = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  font-variant: tabular-nums;
`;

const BalanceRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.large}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const RingHolder = styled.View`
  width: 120px;
  height: 120px;
  align-items: center;
  justify-content: center;
`;

const RingCentre = styled.View`
  position: absolute;
  align-items: center;
  justify-content: center;
`;

const Figures = styled.View`
  flex: 1;
  gap: ${({ theme }) => theme.spacing.medium}px;
`;

const FigureLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  margin-top: 2px;
`;

const Note = styled.View`
  flex-direction: row;
  align-items: baseline;
  gap: 6px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const NoteLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption + 1}px;
`;

const Patterns = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.large}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Pattern = styled.View`
  flex: 1;
`;

const PatternLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  margin-bottom: 4px;
`;

const PatternValue = styled.Text<{ $muted: boolean }>`
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.muted : theme.colors.text};
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
`;

const PatternHint = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  margin-top: 6px;
`;

/* Where the level lives now: one line, caption size, muted. */
const Footnote = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  margin-top: ${({ theme }) => theme.spacing.large}px;
`;
