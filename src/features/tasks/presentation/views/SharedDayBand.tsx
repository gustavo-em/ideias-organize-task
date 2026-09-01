import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import type { TaskCopy } from '../localization/taskCopy';
import type { SharedDayEntry } from '../models/sharedDay';
import { STAGGER_MS } from '../animation/motion';
import { CheckGlyph, PlayGlyph } from './FieldGlyphs';
import { MemberChip } from './MemberChip';
import { PressableScale } from './PressableScale';

interface SharedDayBandProps {
  copy: TaskCopy;
  /** Already ordered by `sharedDay`: focusing, open, done, absent. */
  entries: readonly SharedDayEntry[];
  /** Everyone published a day and every one of them is closed. */
  allDone: boolean;
  /** Days in a row where that happened. Shown only from two upwards. */
  streakDays: number;
  /** The day could not be fetched: what is on screen is what the phone had. */
  offline: boolean;
  /** Absent when there is nothing for this person to take, or when they only
   * have reading rights. */
  onTakeOne?: () => void;
}

/**
 * The band at the top of an open shared project.
 *
 * It answers one question — what did each of us take for today, and did we
 * close it. Never who is ahead: no weight, no points, no level, no personal
 * streak. The project is shared; the scoreboard is not.
 */
export function SharedDayBand({
  copy,
  entries,
  allDone,
  streakDays,
  offline,
  onTakeOne,
}: SharedDayBandProps) {
  const theme = useTheme();

  function stateLabel(entry: SharedDayEntry): string {
    if (entry.state === 'absent') return copy.lists.dayBandAbsent;
    return entry.task?.title ?? copy.lists.dayBandAbsent;
  }

  /** Name, task, state — the glyph on the right is decoration for the eye,
   * so the state has to be said in words for a screen reader. */
  function rowLabel(entry: SharedDayEntry): string {
    const state =
      entry.state === 'focusing'
        ? copy.lists.dayBandStateFocusing
        : entry.state === 'done'
        ? copy.lists.dayBandStateDone
        : entry.state === 'open'
        ? copy.lists.dayBandStateOpen
        : null;

    return state == null
      ? `${entry.member.name}, ${stateLabel(entry)}`
      : `${entry.member.name}, ${stateLabel(entry)}, ${state}`;
  }

  return (
    <Band entering={FadeIn.duration(180)} testID="shared-day-band">
      <Eyebrow>{copy.lists.dayBandTitle}</Eyebrow>

      {entries.length === 0 ? (
        <Note>{copy.lists.dayBandEmpty}</Note>
      ) : (
        entries.map((entry, index) => (
          <Row
            $first={index === 0}
            accessibilityLabel={rowLabel(entry)}
            entering={FadeInDown.delay(index * STAGGER_MS).duration(280)}
            key={entry.member.personId}
          >
            <MemberChip
              inverted
              name={entry.member.name}
              pending={entry.state === 'absent'}
              personId={entry.member.personId}
              size="large"
            />
            <Who>
              <Name numberOfLines={1}>{entry.member.name}</Name>
              <What numberOfLines={1}>{stateLabel(entry)}</What>
            </Who>
            {entry.state === 'focusing' || entry.state === 'done' ? (
              <State
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {entry.state === 'focusing' ? (
                  <PlayGlyph color={theme.colors.onAccent} size={20} />
                ) : (
                  <CheckGlyph color={theme.colors.onAccent} size={16} />
                )}
              </State>
            ) : null}
          </Row>
        ))
      )}

      {allDone ? (
        <Closed>
          <ClosedText>{copy.lists.dayBandAllDone(entries.length)}</ClosedText>
          {streakDays >= 2 ? (
            <Note>{copy.lists.dayBandStreak(streakDays)}</Note>
          ) : null}
        </Closed>
      ) : null}

      {offline ? <Note>{copy.lists.dayBandOffline}</Note> : null}

      {onTakeOne == null ? null : (
        <TakeOne
          accessibilityLabel={copy.lists.dayBandTakeOne}
          onPress={onTakeOne}
          testID="shared-day-take-one"
        >
          <TakeOneText>{copy.lists.dayBandTakeOne}</TakeOneText>
        </TakeOne>
      )}
    </Band>
  );
}

/** Bleeds to both edges from inside the `Expanded` of the lists screen, which
 * carries a left padding of its own. Never a screen width: the band is a
 * field of the page, not a measured box. */
const Band = styled(Animated.View)`
  background-color: ${({ theme }) => theme.colors.accent};
  margin: ${({ theme }) => theme.spacing.medium}px -${({ theme }) =>
      theme.spacing.large}px 0px -${({ theme }) =>
      theme.spacing.large + theme.spacing.small}px;
  padding: ${({ theme }) => theme.spacing.large - 4}px
    ${({ theme }) => theme.spacing.large}px;
`;

const Eyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  margin-bottom: ${({ theme }) => theme.spacing.small}px;
`;

const Row = styled(Animated.View)<{ $first: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small + 4}px;
  min-height: 48px;
  padding: ${({ theme }) => theme.spacing.small}px 0px;
  border-top-width: ${({ $first }) => ($first ? 0 : 1.5)}px;
  border-top-color: ${({ theme }) => theme.colors.onAccentLine};
`;

const State = styled.View`
  align-items: center;
  justify-content: center;
`;

const Who = styled.View`
  flex: 1;
`;

const Name = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 700;
`;

const What = styled.Text`
  color: ${({ theme }) => theme.colors.onAccentSubtle};
  font-size: ${({ theme }) => theme.type.label}px;
`;

const Closed = styled.View`
  margin-top: ${({ theme }) => theme.spacing.small}px;
  border-top-width: 1.5px;
  border-top-color: ${({ theme }) => theme.colors.onAccentLine};
  padding-top: ${({ theme }) => theme.spacing.small}px;
`;

const ClosedText = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 700;
`;

const Note = styled.Text`
  color: ${({ theme }) => theme.colors.onAccentSubtle};
  font-size: ${({ theme }) => theme.type.label}px;
  padding: ${({ theme }) => theme.spacing.tiny}px 0px;
`;

/** The one control that decides something inverts ink and sun. The ground is
 * `onAccent`, not `text`: `text` turns cream in the dark theme and the yellow
 * label would sit on it at 1.4:1. What is written on Sol does not change
 * between modes, and neither does what Sol is written on. */
const TakeOne = styled(PressableScale)`
  align-self: flex-start;
  min-height: 48px;
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
  padding: 15px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.onAccent};
`;

const TakeOneText = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;
