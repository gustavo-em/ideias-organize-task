import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { contentEnter } from '../../../../app/animation/motion';
import { startOfDay } from '../../domain/Day';
import type { TaskCopy } from '../localization/taskCopy';
import type { TasksViewModel } from '../view-models/useTasksViewModel';
import { CountUpText } from '../views/CountUpText';
import { WeekBars } from '../views/WeekBars';

interface ProgressScreenProps {
  copy: TaskCopy;
  viewModel: TasksViewModel;
}

/**
 * What today and this week have been.
 *
 * Two things only: the day, as the one yellow card on the tab, and the week
 * as seven bars. Everything is counted from the tasks on this phone. The
 * level is one quiet line under the person's name, not the subject.
 */
export function ProgressScreen({ copy, viewModel }: ProgressScreenProps) {
  const theme = useTheme();
  const { closedByDay, dayTaskIds, doneToday, level, streakDays, week } =
    viewModel;
  const todayMs = startOfDay(viewModel.nowMs);
  const dayTotal = dayTaskIds.length;
  const closedThisWeek = closedByDay.reduce((sum, day) => sum + day.closed, 0);
  const weekWeight = week.reduce((sum, day) => sum + day.weight, 0);
  const sentence = copy.progress.todaySentence(doneToday, dayTotal, streakDays);

  return (
    <Content>
      <LevelNote testID="progress-level">
        {copy.progress.footnote(level.level, streakDays)}
      </LevelNote>

      <TodayCard
        accessibilityLabel={`${copy.progress.today}. ${sentence}`}
        accessibilityRole="summary"
        accessible
        entering={contentEnter(0)}
        testID="progress-today"
      >
        <View importantForAccessibility="no-hide-descendants">
          <TodayEyebrow>{copy.progress.today}</TodayEyebrow>
          <TodayFigures>
            <CountUpText
              style={[styles.todayCount, { color: theme.colors.text }]}
              testID="today-done"
              value={doneToday}
            />
            <TodayOf>{copy.progress.todayOf(dayTotal)}</TodayOf>
          </TodayFigures>
          <TodaySentence>{sentence}</TodaySentence>
        </View>
      </TodayCard>

      <Block entering={contentEnter(1)}>
        <Heading>
          <HeadingLine>
            <HeadingLabel>{copy.progress.sevenDays}</HeadingLabel>
            <HeadingCount testID="week-closed">
              {copy.progress.weekWeight(weekWeight)}
            </HeadingCount>
          </HeadingLine>
          <HeadingRule />
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
          </View>
        </View>
      </Block>
    </Content>
  );
}

/* Tabular figures: a count that shifts sideways as it counts up reads as a
   glitch, not as motion. */
const styles = StyleSheet.create({
  todayCount: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 48,
    fontVariant: ['tabular-nums'],
  },
});

/* The tab owns the scroll; this block only asks for the height it needs. */
const Content = styled.View`
  padding: 0px ${({ theme }) => theme.spacing.large}px;
`;

/* Level and streak, in line with the name above: the identity's third line. */
const LevelNote = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 500;
  line-height: 18px;
  margin-top: ${({ theme }) => theme.spacing.tiny}px;
`;

/* The only yellow card on the tab. */
const TodayCard = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.large}px;
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radii.large}px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const TodayEyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 1.8px;
  text-transform: uppercase;
`;

const TodayFigures = styled.View`
  flex-direction: row;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const TodayOf = styled.Text`
  color: ${({ theme }) => theme.colors.onAccentSubtle};
  font-size: 18px;
  font-weight: 800;
`;

const TodaySentence = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 600;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

/* No surface of its own: a block is grouped by its heading, its rule and the
   space around it, never by another box. */
const Block = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.large}px;
`;

const Heading = styled.View`
  gap: ${({ theme }) => theme.spacing.small}px;
`;

const HeadingLine = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

const HeadingLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 1.8px;
  text-transform: uppercase;
`;

const HeadingCount = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 600;
  font-variant: tabular-nums;
`;

/* The rule sits under the line of text and crosses the whole width. */
const HeadingRule = styled.View.attrs({
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no' as const,
})`
  height: 1px;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;
