import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { contentEnter } from '../../../../app/animation/motion';
import type { TaskCopy } from '../localization/taskCopy';
import type { TasksViewModel } from '../view-models/useTasksViewModel';
import { CountUpText } from '../views/CountUpText';
import { ScreenHeader } from '../views/ScreenHeader';
import { WeekBars } from '../views/WeekBars';

interface ProgressScreenProps {
  copy: TaskCopy;
  viewModel: TasksViewModel;
}

/**
 * What the person has actually been doing.
 *
 * Everything here is measured in weight rather than in count, and the line
 * under the chart says so out loud. It is the promise that slicing a task in
 * half will not move any of these numbers.
 */
export function ProgressScreen({ copy, viewModel }: ProgressScreenProps) {
  const theme = useTheme();
  const { level } = viewModel;

  return (
    <Content>
      <ScreenHeader
        eyebrow={copy.progress.title}
        subtitle={copy.progress.streakHint}
        title={copy.progress.streakTitle(viewModel.streakDays)}
      />

      <Section entering={contentEnter(0)}>
        <SectionLabel>{copy.progress.week}</SectionLabel>
        <WeekBars week={viewModel.week} weekdays={copy.progress.weekdays} />
        <Note>{copy.progress.weightHint}</Note>
      </Section>

      <Cards>
        <Card entering={contentEnter(1)}>
          <CardValue>{copy.progress.level(level.level)}</CardValue>
          <CardLabel>
            {copy.progress.levelPoints(level.intoLevel, level.levelSpan)}
          </CardLabel>
          <Track>
            <Fill
              style={{
                width: `${
                  level.levelSpan === 0
                    ? 0
                    : (level.intoLevel / level.levelSpan) * 100
                }%`,
              }}
            />
          </Track>
        </Card>

        <Card entering={contentEnter(2)}>
          <CountUpText
            accessibilityLabel={`${viewModel.trioCount} ${copy.progress.trios}`}
            style={[styles.count, { color: theme.colors.text }]}
            testID="trio-count"
            value={viewModel.trioCount}
          />
          <CardLabel>{copy.progress.trios}</CardLabel>
        </Card>
      </Cards>
    </Content>
  );
}

const styles = StyleSheet.create({
  count: { fontSize: 30, fontWeight: '800', letterSpacing: -1 },
});

/* The tab owns the scroll; this block only asks for the height it needs, so the
   seven-day card is never clipped by the settings group under it. */
const Content = styled.View`
  padding: 0px ${({ theme }) => theme.spacing.large}px
    ${({ theme }) => theme.spacing.large}px;
`;

const Section = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.medium}px;
  padding: ${({ theme }) => theme.spacing.medium}px;
  border-radius: ${({ theme }) => theme.radii.large}px;
  background-color: ${({ theme }) => theme.colors.card};
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  elevation: 2;
  shadow-color: #1b1710;
  shadow-opacity: ${({ theme }) => (theme.mode === 'dark' ? 0 : 0.07)};
  shadow-radius: 14px;
  shadow-offset: 0px 5px;
`;

const SectionLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
`;

const Note = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Cards = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.small + 2}px;
  margin-top: ${({ theme }) => theme.spacing.small + 2}px;
`;

const Card = styled(Animated.View)`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.medium}px;
  border-radius: ${({ theme }) => theme.radii.large}px;
  background-color: ${({ theme }) => theme.colors.card};
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  elevation: 2;
  shadow-color: #1b1710;
  shadow-opacity: ${({ theme }) => (theme.mode === 'dark' ? 0 : 0.07)};
  shadow-radius: 14px;
  shadow-offset: 0px 5px;
`;

const CardValue = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -1px;
`;

const CardLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  margin-top: 4px;
`;

const Track = styled.View`
  height: 4px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
  overflow: hidden;
  margin-top: ${({ theme }) => theme.spacing.small + 2}px;
`;

const Fill = styled.View`
  height: 100%;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.accent};
`;
