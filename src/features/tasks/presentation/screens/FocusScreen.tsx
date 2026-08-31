import { useEffect } from 'react';
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { isOpen } from '../../domain/Task';
import { GROUND } from '../animation/motion';
import type { TaskCopy } from '../localization/taskCopy';
import type { FocusViewModel } from '../view-models/useFocusViewModel';
import type { TasksViewModel } from '../view-models/useTasksViewModel';
import { PressableScale } from '../views/PressableScale';
import { ProgressRing } from '../views/ProgressRing';
import { ScreenHeader } from '../views/ScreenHeader';

interface FocusScreenProps {
  copy: TaskCopy;
  focus: FocusViewModel;
  viewModel: TasksViewModel;
}

const RING_SIZE = 232;

/**
 * The only screen that changes the colour of the phone.
 *
 * Leaving the list means leaving the list's ground: the app goes from paper to
 * violet while a session runs, so a glance from across the desk says whether
 * work is happening without reading a word.
 */
export function FocusScreen({ copy, focus, viewModel }: FocusScreenProps) {
  const theme = useTheme();
  const open = viewModel.today.filter(isOpen);
  const active = useSharedValue(focus.session == null ? 0 : 1);
  const running = focus.session != null;
  const task = viewModel.today.find(
    entry => entry.id === focus.session?.taskId,
  );
  const position =
    task == null
      ? 0
      : viewModel.today.findIndex(entry => entry.id === task.id) + 1;

  useEffect(() => {
    active.value = withTiming(running ? 1 : 0, GROUND);
  }, [active, running]);

  const groundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      active.value,
      [0, 1],
      [theme.colors.background, theme.colors.focus],
    ),
  }));

  const inkStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      active.value,
      [0, 1],
      [theme.colors.text, theme.colors.onFocus],
    ),
  }));

  return (
    <Ground style={groundStyle}>
      {focus.session == null ? (
        <Idle entering={FadeIn.duration(240)}>
          {/* Anchored at the top like every other screen. Centred, it read as
              a dialog that had lost its way. */}
          <ScreenHeader
            eyebrow={copy.focus.title}
            subtitle={copy.focus.idleHint}
            title={open.length === 0 ? copy.focus.idleEmpty : copy.focus.idle}
          />

          {open.map(candidate => (
            <Choice
              accessibilityLabel={candidate.title}
              key={candidate.id}
              onPress={() => focus.start(candidate)}
              testID={`focus-start-${candidate.id}`}
            >
              <ChoiceTitle numberOfLines={1}>{candidate.title}</ChoiceTitle>
              <ChoiceMeta>
                {copy.capture.minutes(candidate.estimatedMinutes ?? 25)}
              </ChoiceMeta>
            </Choice>
          ))}
        </Idle>
      ) : (
        <Session entering={FadeIn.duration(240)}>
          <Eyebrow>
            {copy.focus.ofTrio(Math.max(1, position), viewModel.today.length)}
          </Eyebrow>

          <RingStage>
            <ProgressRing
              color={theme.colors.accent}
              fraction={focus.fraction}
              size={RING_SIZE}
              trackColor="rgba(255, 255, 255, 0.16)"
            />
            <RingCentre pointerEvents="none">
              <Clock>{focus.label}</Clock>
              <ClockLabel>
                {focus.isFinished ? copy.focus.finished : copy.focus.remaining}
              </ClockLabel>
            </RingCentre>
          </RingStage>

          <TaskTitle style={inkStyle}>{task?.title ?? ''}</TaskTitle>

          <Actions>
            {focus.isFinished ? null : (
              <Primary
                accessibilityLabel={
                  focus.isRunning ? copy.focus.pause : copy.focus.resume
                }
                onPress={focus.isRunning ? focus.pause : focus.resume}
                testID="focus-toggle"
              >
                <PrimaryText>
                  {focus.isRunning ? copy.focus.pause : copy.focus.resume}
                </PrimaryText>
              </Primary>
            )}

            <Secondary
              accessibilityLabel={copy.focus.complete}
              onPress={() => {
                if (task != null) viewModel.toggle(task.id);
                focus.stop();
              }}
              testID="focus-complete"
            >
              <SecondaryText>{copy.focus.complete}</SecondaryText>
            </Secondary>

            <Secondary
              accessibilityLabel={copy.focus.finish}
              onPress={focus.stop}
              testID="focus-stop"
            >
              <SecondaryText>{copy.focus.finish}</SecondaryText>
            </Secondary>
          </Actions>
        </Session>
      )}
    </Ground>
  );
}

const Ground = styled(Animated.View)`
  flex: 1;
  padding: 0px ${({ theme }) => theme.spacing.large}px;
`;

const Idle = styled(Animated.View)`
  flex: 1;
`;

const Choice = styled(PressableScale)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.medium}px;
  background-color: ${({ theme }) => theme.colors.card};
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: ${({ theme }) => theme.radii.large}px;
  padding: ${({ theme }) => theme.spacing.medium}px;
  margin-top: ${({ theme }) => theme.spacing.small + 2}px;
  elevation: 2;
  shadow-color: #1b1710;
  shadow-opacity: ${({ theme }) => (theme.mode === 'dark' ? 0 : 0.07)};
  shadow-radius: 14px;
  shadow-offset: 0px 5px;
`;

const ChoiceTitle = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 600;
`;

const ChoiceMeta = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 700;
`;

const Session = styled(Animated.View)`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

const Eyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.onFocus};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 700;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  opacity: 0.6;
`;

const RingStage = styled.View`
  margin-top: ${({ theme }) => theme.spacing.large}px;
  align-items: center;
  justify-content: center;
`;

const RingCentre = styled.View`
  position: absolute;
  align-items: center;
`;

const Clock = styled.Text`
  color: ${({ theme }) => theme.colors.onFocus};
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -1.4px;
`;

const ClockLabel = styled.Text`
  color: ${({ theme }) => theme.colors.onFocus};
  font-size: ${({ theme }) => theme.type.caption}px;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  opacity: 0.55;
  margin-top: 2px;
`;

const TaskTitle = styled(Animated.Text)`
  font-size: ${({ theme }) => theme.type.heading}px;
  font-weight: 800;
  letter-spacing: -0.5px;
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.large}px;
`;

const Actions = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.small + 2}px;
  margin-top: ${({ theme }) => theme.spacing.large}px;
`;

const Primary = styled(PressableScale)`
  background-color: ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  padding: 12px 24px;
`;

const PrimaryText = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;

const Secondary = styled(PressableScale)`
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: ${({ theme }) => theme.radii.medium}px;
  padding: 12px 18px;
`;

const SecondaryText = styled.Text`
  color: ${({ theme }) => theme.colors.onFocus};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;
