import { useEffect, useState } from 'react';
import Animated, {
  Easing,
  FadeIn,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import {
  buttonTextAttrs,
  buttonTextMetrics,
} from '../../../../app/theme/buttonText';
import { isOpen, type Task } from '../../domain/Task';
import { clampFocusMinutes, focusMinutesFor } from '../../domain/FocusSession';
import { FADE, GROUND } from '../animation/motion';
import type { TaskCopy } from '../localization/taskCopy';
import type { FocusViewModel } from '../view-models/useFocusViewModel';
import type { TasksViewModel } from '../view-models/useTasksViewModel';
import { DurationPicker } from '../views/DurationPicker';
import {
  CheckGlyph,
  PauseGlyph,
  PlayGlyph,
  StopGlyph,
} from '../views/FieldGlyphs';
import { FocusAchievement } from '../views/FocusAchievement';
import { PressableScale } from '../views/PressableScale';
import { ProgressRing } from '../views/ProgressRing';
import { ScreenHeader } from '../views/ScreenHeader';

interface FocusScreenProps {
  copy: TaskCopy;
  focus: FocusViewModel;
  viewModel: TasksViewModel;
  /** Arrived here from the now band's time block: this task opens with its
   * duration ready to change, and nothing has started. It is passed whole
   * because the idle list only holds the trio, and this task may not be in
   * it — arriving from the band must not land on an empty screen. */
  openDurationFor?: Task | null;
}

const RING_SIZE = 232;

/**
 * The only screen that changes the colour of the phone.
 *
 * Leaving the list means leaving the list's ground: the app goes from paper to
 * a warm, deep ground while a session runs, so a glance from across the desk
 * says whether work is happening without reading a word.
 */
export function FocusScreen({
  copy,
  focus,
  viewModel,
  openDurationFor,
}: FocusScreenProps) {
  const theme = useTheme();
  const trio = viewModel.today.filter(isOpen);
  const open =
    openDurationFor != null &&
    isOpen(openDurationFor) &&
    !trio.some(entry => entry.id === openDurationFor.id)
      ? [openDurationFor, ...trio]
      : trio;
  const active = useSharedValue(focus.session == null ? 0 : 1);
  const running = focus.session != null;
  // Looked up in every task, not only the trio: a session can be started from
  // the now band, and then the title would come back empty.
  const task = viewModel.tasks.find(
    entry => entry.id === focus.session?.taskId,
  );

  // Every edge and track on the session used to be white at low alpha, which
  // only works when the ground is dark. Now that light mode keeps a light
  // ground, the veil has to follow the ink.
  const veil = (alpha: number) =>
    theme.mode === 'dark'
      ? `rgba(255, 255, 255, ${alpha})`
      : `rgba(27, 23, 16, ${alpha})`;

  const [expandedId, setExpandedId] = useState<string | null>(
    openDurationFor?.id ?? null,
  );

  useEffect(() => {
    if (openDurationFor != null) setExpandedId(openDurationFor.id);
  }, [openDurationFor]);
  const [minutesById, setMinutesById] = useState<Record<string, number>>({});

  useEffect(() => {
    active.value = withTiming(running ? 1 : 0, GROUND);
  }, [active, running]);

  // The ring breathes while the timer is actually counting down, and holds
  // still the instant it is paused: the stillness is the feedback.
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (focus.isRunning) {
      pulse.value = withRepeat(
        withTiming(1.02, {
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(1, FADE);
    }
  }, [focus.isRunning, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // A small tick on the label itself, so the seconds feel like they are
  // moving rather than being silently swapped out underneath the finger.
  const bump = useSharedValue(1);
  useEffect(() => {
    bump.value = 1.05;
    bump.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.quad),
      reduceMotion: ReduceMotion.System,
    });
  }, [focus.label, bump]);

  const bumpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bump.value }],
  }));

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

  const minutesFor = (candidateId: string, estimatedMinutes: number | null) =>
    minutesById[candidateId] ?? focusMinutesFor(estimatedMinutes);

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

          {open.map(candidate => {
            const expanded = expandedId === candidate.id;
            const minutes = minutesFor(
              candidate.id,
              candidate.estimatedMinutes,
            );

            return (
              <Choice key={candidate.id}>
                <ChoiceHead
                  accessibilityLabel={candidate.title}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() =>
                    setExpandedId(current =>
                      current === candidate.id ? null : candidate.id,
                    )
                  }
                  testID={`focus-start-${candidate.id}`}
                >
                  <ChoiceTitle numberOfLines={1}>{candidate.title}</ChoiceTitle>
                  <ChoiceMeta>
                    <ChoiceMetaText>
                      {copy.capture.minutes(minutes)}
                    </ChoiceMetaText>
                  </ChoiceMeta>
                </ChoiceHead>

                {expanded ? (
                  <Expanded entering={FadeIn.duration(180)}>
                    <ExpandedLabel>{copy.focus.chooseDuration}</ExpandedLabel>
                    <DurationPicker
                      copy={copy}
                      minutes={minutes}
                      onChange={next =>
                        setMinutesById(current => ({
                          ...current,
                          [candidate.id]: clampFocusMinutes(next),
                        }))
                      }
                    />
                    <ExpandedActions>
                      <CancelButton
                        accessibilityLabel={copy.focus.cancel}
                        onPress={() => setExpandedId(null)}
                        testID={`focus-cancel-${candidate.id}`}
                      >
                        <CancelText>{copy.focus.cancel}</CancelText>
                      </CancelButton>
                      <StartButton
                        accessibilityLabel={copy.focus.start}
                        onPress={() => {
                          focus.start(candidate, minutes);
                          setExpandedId(null);
                        }}
                        testID={`focus-start-confirm-${candidate.id}`}
                      >
                        <StartText>{copy.focus.start}</StartText>
                      </StartButton>
                    </ExpandedActions>
                  </Expanded>
                ) : null}
              </Choice>
            );
          })}
        </Idle>
      ) : (
        <Session entering={FadeIn.duration(240)} testID="focus-session">
          <RingStage
            style={pulseStyle}
            testID={
              focus.isFinished
                ? 'focus-session-finished'
                : 'focus-session-running'
            }
          >
            <ProgressRing
              color={
                focus.isFinished ? theme.colors.success : theme.colors.accent
              }
              fraction={focus.fraction}
              size={RING_SIZE}
              trackColor={veil(theme.mode === 'dark' ? 0.16 : 0.12)}
            />
            <RingCentre pointerEvents="none">
              <Clock style={bumpStyle}>{focus.label}</Clock>
              <ClockLabel>
                {focus.isFinished ? copy.focus.finished : copy.focus.remaining}
              </ClockLabel>
            </RingCentre>
            {focus.isFinished ? (
              <FocusAchievement testID="focus-achievement" />
            ) : null}
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
                {focus.isRunning ? (
                  <PauseGlyph color={theme.colors.onAccent} size={15} />
                ) : (
                  <PlayGlyph color={theme.colors.onAccent} size={15} />
                )}
                <PrimaryText>
                  {focus.isRunning ? copy.focus.pause : copy.focus.resume}
                </PrimaryText>
              </Primary>
            )}

            <Complete
              accessibilityLabel={copy.focus.complete}
              filled={focus.isFinished}
              onPress={() => {
                if (task != null) viewModel.toggle(task.id);
                focus.stop();
              }}
              testID="focus-complete"
            >
              <CheckGlyph
                color={
                  focus.isFinished
                    ? theme.colors.onAccent
                    : theme.colors.onFocus
                }
                size={15}
              />
              <CompleteText filled={focus.isFinished}>
                {copy.focus.complete}
              </CompleteText>
            </Complete>

            <Secondary
              accessibilityLabel={
                focus.isFinished ? copy.focus.newFocus : copy.focus.finish
              }
              onPress={focus.stop}
              testID="focus-stop"
            >
              <StopGlyph color={theme.colors.onFocus} size={13} />
              <SecondaryText>
                {focus.isFinished ? copy.focus.newFocus : copy.focus.finish}
              </SecondaryText>
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

const Choice = styled.View`
  background-color: ${({ theme }) => theme.colors.card};
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: ${({ theme }) => theme.radii.large}px;
  margin-top: ${({ theme }) => theme.spacing.small + 2}px;
  overflow: hidden;
  elevation: 2;
  shadow-color: #1b1710;
  shadow-opacity: ${({ theme }) => (theme.mode === 'dark' ? 0 : 0.07)};
  shadow-radius: 14px;
  shadow-offset: 0px 5px;
`;

const ChoiceHead = styled(PressableScale)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.medium}px;
  padding: ${({ theme }) => theme.spacing.medium}px;
`;

const ChoiceTitle = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 600;
`;

const ChoiceMeta = styled.View`
  background-color: ${({ theme }) => theme.colors.cardElevated};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  padding: 4px 10px;
`;

const ChoiceMetaText = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 700;
`;

const Expanded = styled(Animated.View)`
  padding: 0px ${({ theme }) => theme.spacing.medium}px
    ${({ theme }) => theme.spacing.medium}px;
`;

const ExpandedLabel = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;

const ExpandedActions = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const CancelButton = styled(PressableScale)`
  flex: 1;
  align-items: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  padding: 10px;
`;

const CancelText = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;

const StartButton = styled(PressableScale)`
  flex: 1;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  padding: 10px;
`;

const StartText = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;

const Session = styled(Animated.View)`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

const RingStage = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.large}px;
  align-items: center;
  justify-content: center;
`;

const RingCentre = styled.View`
  position: absolute;
  align-items: center;
`;

const Clock = styled(Animated.Text)`
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
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small - 1}px;
  background-color: ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  min-height: 48px;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
`;

const PrimaryText = styled.Text.attrs(buttonTextAttrs)`
  color: ${({ theme }) => theme.colors.onAccent};
  ${({ theme }) => buttonTextMetrics(theme.type.label)}
  font-weight: 800;
`;

const Complete = styled(PressableScale)<{ filled: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small - 1}px;
  background-color: ${({ theme, filled }) =>
    filled ? theme.colors.success : 'transparent'};
  border: 1px solid
    ${({ theme, filled }) =>
      filled
        ? theme.colors.success
        : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.28)'
        : 'rgba(27, 23, 16, 0.22)'};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  min-height: 48px;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
`;

const CompleteText = styled.Text.attrs(buttonTextAttrs)<{ filled: boolean }>`
  color: ${({ theme, filled }) =>
    filled ? theme.colors.onAccent : theme.colors.onFocus};
  ${({ theme }) => buttonTextMetrics(theme.type.label)}
  font-weight: ${({ filled }) => (filled ? 800 : 700)};
`;

const Secondary = styled(PressableScale)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small - 1}px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.28)'
        : 'rgba(27, 23, 16, 0.22)'};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  min-height: 48px;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
`;

const SecondaryText = styled.Text.attrs(buttonTextAttrs)`
  color: ${({ theme }) => theme.colors.onFocus};
  ${({ theme }) => buttonTextMetrics(theme.type.label)}
  font-weight: 700;
`;
