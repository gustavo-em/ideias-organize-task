import { useEffect, useState } from 'react';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';

import {
  buttonTextAttrs,
  buttonTextMetrics,
} from '../../../../app/theme/buttonText';
import { isOpen, type Task } from '../../domain/Task';
import { clampFocusMinutes, focusMinutesFor } from '../../domain/FocusSession';
import {
  BREATH,
  BREATH_SCALE,
  BUMP,
  BUMP_SCALE,
  contentFadeEnter,
  FADE,
  fadeEnter,
  GROUND,
} from '../../../../app/animation/motion';
import type { TaskCopy } from '../localization/taskCopy';
import type { FocusViewModel } from '../view-models/useFocusViewModel';
import type { TasksViewModel } from '../view-models/useTasksViewModel';
import { DurationPicker } from '../views/DurationPicker';
import { PauseGlyph, PlayGlyph } from '../views/FieldGlyphs';
import { FocusAchievement } from '../views/FocusAchievement';
import { PressableScale } from '../views/PressableScale';
import { ProgressRing } from '../views/ProgressRing';

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

const RING_SIZE = 250;
const RING_STROKE = 12;
/** Every button label on this screen, per the shared rule: 14 on a 52 button. */
const BUTTON_LABEL = 14;
/** How far the footer sits from the bottom edge of the phone. */
const FOOTER_MARGIN = 38;

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
  const insets = useSafeAreaInsets();
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
  const plannedMinutes =
    focus.session == null ? null : Math.round(focus.session.plannedMs / 60000);

  // Every edge and track on the session is ink at low alpha, which only works
  // on a light ground. Dark mode keeps a dark ground, so there the veil has to
  // follow the paper instead.
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
      pulse.value = withRepeat(withTiming(BREATH_SCALE, BREATH), -1, true);
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
    bump.value = BUMP_SCALE;
    bump.value = withTiming(1, BUMP);
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

  const minutesFor = (candidateId: string, estimatedMinutes: number | null) =>
    minutesById[candidateId] ?? focusMinutesFor(estimatedMinutes);

  // The footer measures its margin from the edge of the phone, not from the
  // safe area: on a phone with a home indicator the two would otherwise add
  // up and push the buttons into the ring.
  const footerMargin = Math.max(
    FOOTER_MARGIN - insets.bottom,
    theme.spacing.medium,
  );

  return (
    <Ground style={groundStyle}>
      {focus.session == null ? (
        <Idle entering={contentFadeEnter()}>
          <TopRow>
            <Eyebrow>{copy.focus.title}</Eyebrow>
          </TopRow>

          <Title numberOfLines={2}>
            {open.length === 0 ? copy.focus.idleEmpty : copy.focus.idle}
          </Title>

          {/* One short list is not a missing list: this says which slice is on
              screen and where the rest of the day still is. With nothing open
              there is no slice to explain, and the empty message stands
              alone. */}
          {open.length === 0 ? null : (
            <ScopeNote>{copy.focus.idleScope}</ScopeNote>
          )}

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
                  <ChoiceMeta>{copy.capture.minutes(minutes)}</ChoiceMeta>
                </ChoiceHead>

                {expanded ? (
                  <Expanded entering={fadeEnter()}>
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
                    <ButtonRow>
                      <Outlined
                        accessibilityLabel={copy.focus.cancel}
                        onPress={() => setExpandedId(null)}
                        testID={`focus-cancel-${candidate.id}`}
                      >
                        <OutlinedText>{copy.focus.cancel}</OutlinedText>
                      </Outlined>
                      <Filled
                        accessibilityLabel={copy.focus.start}
                        onPress={() => {
                          focus.start(candidate, minutes);
                          setExpandedId(null);
                        }}
                        testID={`focus-start-confirm-${candidate.id}`}
                      >
                        <FilledText>{copy.focus.start}</FilledText>
                      </Filled>
                    </ButtonRow>
                  </Expanded>
                ) : null}
              </Choice>
            );
          })}
        </Idle>
      ) : (
        <Session entering={contentFadeEnter()} testID="focus-session">
          <TopRow>
            <Eyebrow>{copy.focus.title}</Eyebrow>
            {plannedMinutes == null ? null : (
              <Duration>{copy.capture.minutes(plannedMinutes)}</Duration>
            )}
          </TopRow>

          <Title numberOfLines={2}>{task?.title ?? ''}</Title>

          <Stage>
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
                  focus.isFinished
                    ? theme.colors.success
                    : theme.colors.reminder
                }
                fraction={focus.fraction}
                size={RING_SIZE}
                strokeWidth={RING_STROKE}
                trackColor={veil(theme.mode === 'dark' ? 0.14 : 0.1)}
              />
              <RingCentre pointerEvents="none">
                <Clock style={bumpStyle}>{focus.label}</Clock>
                <ClockLabel>
                  {focus.isFinished
                    ? copy.focus.finished
                    : copy.focus.remaining}
                </ClockLabel>
              </RingCentre>
              {focus.isFinished ? (
                <FocusAchievement testID="focus-achievement" />
              ) : null}
            </RingStage>
          </Stage>

          <Footer style={{ paddingBottom: footerMargin }}>
            {/* Ending a block early is allowed, never advertised: a quiet line
                above the two real choices, not a third button beside them. */}
            {focus.isFinished ? null : (
              <Quiet
                accessibilityLabel={copy.focus.finish}
                onPress={focus.stop}
                testID="focus-stop"
              >
                <QuietText>{copy.focus.finish}</QuietText>
              </Quiet>
            )}

            <ButtonRow>
              {focus.isFinished ? null : (
                <Filled
                  accessibilityLabel={
                    focus.isRunning ? copy.focus.pause : copy.focus.resume
                  }
                  onPress={focus.isRunning ? focus.pause : focus.resume}
                  testID="focus-toggle"
                >
                  {focus.isRunning ? (
                    <PauseGlyph color={theme.colors.background} size={15} />
                  ) : (
                    <PlayGlyph color={theme.colors.background} size={15} />
                  )}
                  <FilledText>
                    {focus.isRunning ? copy.focus.pause : copy.focus.resume}
                  </FilledText>
                </Filled>
              )}

              {focus.isFinished ? (
                <Filled
                  accessibilityLabel={copy.focus.complete}
                  onPress={() => {
                    if (task != null) viewModel.toggle(task.id);
                    focus.stop();
                  }}
                  testID="focus-complete"
                >
                  <FilledText>{copy.focus.complete}</FilledText>
                </Filled>
              ) : (
                <Outlined
                  accessibilityLabel={copy.focus.complete}
                  onPress={() => {
                    if (task != null) viewModel.toggle(task.id);
                    focus.stop();
                  }}
                  testID="focus-complete"
                >
                  <OutlinedText>{copy.focus.complete}</OutlinedText>
                </Outlined>
              )}

              {focus.isFinished ? (
                <Outlined
                  accessibilityLabel={copy.focus.newFocus}
                  onPress={focus.stop}
                  testID="focus-stop"
                >
                  <OutlinedText>{copy.focus.newFocus}</OutlinedText>
                </Outlined>
              ) : null}
            </ButtonRow>
          </Footer>
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

const Session = styled(Animated.View)`
  flex: 1;
`;

const TopRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 20px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const Eyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 1.8px;
  text-transform: uppercase;
`;

const Duration = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  font-weight: 600;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.title}px;
  line-height: ${({ theme }) => theme.type.title * 1.14}px;
  font-weight: 800;
  letter-spacing: -0.5px;
  text-align: center;
  margin-top: 44px;
`;

const ScopeNote = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
  font-weight: 600;
  text-align: center;
  margin-top: 10px;
`;

/* A plain card, the way every card in the app is now: no shadow, no border,
   the paper under it does the separating. */
const Choice = styled.View`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.large}px;
  margin-top: ${({ theme }) => theme.spacing.small + 4}px;
  overflow: hidden;
`;

const ChoiceHead = styled(PressableScale)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.medium}px;
  padding: ${({ theme }) => theme.spacing.medium}px
    ${({ theme }) => theme.spacing.medium + 2}px;
`;

const ChoiceTitle = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 600;
`;

const ChoiceMeta = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  font-weight: 600;
`;

const Expanded = styled(Animated.View)`
  padding: 0px ${({ theme }) => theme.spacing.medium + 2}px
    ${({ theme }) => theme.spacing.medium + 2}px;
`;

const ExpandedLabel = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;

/* The ring stands under the title, not in the middle of whatever is left: a
   clock that drifts with the screen height reads as unplaced. */
const Stage = styled.View`
  flex: 1;
  align-items: center;
  justify-content: flex-start;
  margin: ${({ theme }) => theme.spacing.extraLarge + 8}px 0px
    ${({ theme }) => theme.spacing.medium}px;
`;

const RingStage = styled(Animated.View)`
  align-items: center;
  justify-content: center;
`;

const RingCentre = styled.View`
  position: absolute;
  align-items: center;
`;

const Clock = styled(Animated.Text)`
  color: ${({ theme }) => theme.colors.text};
  font-size: 58px;
  line-height: 58px;
  font-weight: 800;
  letter-spacing: -2.5px;
  font-variant: tabular-nums;
`;

const ClockLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 600;
  margin-top: 10px;
`;

const Footer = styled.View`
  margin-top: auto;
`;

const Quiet = styled(PressableScale)`
  align-self: center;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
  margin-bottom: ${({ theme }) => theme.spacing.tiny}px;
`;

const QuietText = styled.Text.attrs(buttonTextAttrs)`
  color: ${({ theme }) => theme.colors.muted};
  ${({ theme }) => buttonTextMetrics(theme.type.label)}
  font-weight: 700;
`;

const ButtonRow = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.small + 4}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Filled = styled(PressableScale)`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  background-color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  min-height: 52px;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
`;

const FilledText = styled.Text.attrs(buttonTextAttrs)`
  color: ${({ theme }) => theme.colors.background};
  ${buttonTextMetrics(BUTTON_LABEL)}
  font-weight: 800;
`;

const Outlined = styled(PressableScale)`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.35)'
        : 'rgba(27, 23, 16, 0.35)'};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  min-height: 52px;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
`;

const OutlinedText = styled.Text.attrs(buttonTextAttrs)`
  color: ${({ theme }) => theme.colors.text};
  ${buttonTextMetrics(BUTTON_LABEL)}
  font-weight: 700;
`;
