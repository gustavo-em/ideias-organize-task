import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import type { TaskCopy } from '../localization/taskCopy';
import type { SharedDayEntry } from '../models/sharedDay';
import { STAGGER_MS } from '../animation/motion';
import { CheckGlyph } from './FieldGlyphs';
import { memberDisplayName } from '../models/memberIdentity';
import { MemberChip } from './MemberChip';
import { PressableScale } from './PressableScale';
import { FocusGlyph } from './TabGlyphs';

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
      ? `${memberDisplayName(
          entry.member,
          copy.lists.memberSomeone,
        )}, ${stateLabel(entry)}`
      : `${memberDisplayName(
          entry.member,
          copy.lists.memberSomeone,
        )}, ${stateLabel(entry)}, ${state}`;
  }

  return (
    <Band entering={FadeIn.duration(180)} testID="shared-day-band">
      <Eyebrow>{copy.lists.dayBandTitle}</Eyebrow>

      {entries.length === 0 ? (
        // Empty and offline are exclusive: with no network the band says why it
        // knows nothing, and never claims an empty day it could not read.
        offline ? null : (
          <Empty testID="shared-day-empty">{copy.lists.dayBandEmpty}</Empty>
        )
      ) : allDone ? (
        <>
          <Row
            $first
            accessibilityLabel={copy.lists.dayBandAllDone(entries.length)}
            entering={FadeInDown.duration(280)}
            testID="shared-day-all-done"
          >
            <Stack
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {entries.map((entry, index) => (
                <MemberChip
                  inverted
                  key={entry.member.personId}
                  name={memberDisplayName(
                    entry.member,
                    copy.lists.memberSomeone,
                  )}
                  personId={entry.member.personId}
                  size="large"
                  stacked={index > 0}
                />
              ))}
            </Stack>
            <Who>
              <ClosedText>
                {copy.lists.dayBandAllDone(entries.length)}
              </ClosedText>
            </Who>
            <State
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <CheckGlyph color={theme.colors.onAccent} size={16} />
            </State>
          </Row>
          {streakDays >= 2 ? (
            <Note $ruled>{copy.lists.dayBandStreak(streakDays)}</Note>
          ) : null}
        </>
      ) : (
        entries.map((entry, index) => (
          <Row
            $first={index === 0}
            accessibilityLabel={rowLabel(entry)}
            entering={FadeInDown.delay(index * STAGGER_MS).duration(280)}
            key={entry.member.personId}
            testID={`shared-day-row-${entry.state}`}
          >
            <MemberChip
              inverted
              name={memberDisplayName(entry.member, copy.lists.memberSomeone)}
              pending={entry.state === 'absent'}
              personId={entry.member.personId}
              size="large"
            />
            <Who>
              <Name $dim={entry.state === 'absent'} numberOfLines={1}>
                {memberDisplayName(entry.member, copy.lists.memberSomeone)}
              </Name>
              <What $done={entry.state === 'done'} numberOfLines={1}>
                {stateLabel(entry)}
              </What>
            </Who>
            {entry.state === 'focusing' || entry.state === 'done' ? (
              <State
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {entry.state === 'focusing' ? (
                  <FocusGlyph active color={theme.colors.onAccent} size={20} />
                ) : (
                  <CheckGlyph color={theme.colors.onAccent} size={16} />
                )}
              </State>
            ) : null}
          </Row>
        ))
      )}

      {offline ? (
        // One rule per band, and only under something: with no line above it
        // the filete would separate the sentence from nothing, and a second
        // one under the streak note would read as a box.
        <Note
          $ruled={entries.length > 0 && (!allDone || streakDays < 2)}
          testID="shared-day-offline"
        >
          {copy.lists.dayBandOffline}
        </Note>
      ) : null}

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

/** The stack of everyone who closed, in place of the lines: the day is one
 * fact now, not four. */
const Stack = styled.View`
  flex-direction: row;
  align-items: center;
`;

/** The empty band still says something, in the size of a sentence and not of
 * a footnote — it is the band's only line. */
const Empty = styled.Text`
  color: ${({ theme }) => theme.colors.onAccentSubtle};
  font-size: ${({ theme }) => theme.type.body}px;
  line-height: ${({ theme }) => theme.type.body + 7}px;
  margin-top: ${({ theme }) => theme.spacing.small + 6}px;
`;

const Who = styled.View`
  flex: 1;
`;

const Name = styled.Text<{ $dim?: boolean }>`
  color: ${({ theme, $dim }) =>
    $dim ? theme.colors.onAccentSubtle : theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 700;
`;

const What = styled.Text<{ $done?: boolean }>`
  color: ${({ theme }) => theme.colors.onAccentSubtle};
  font-size: ${({ theme }) => theme.type.label}px;
  text-decoration-line: ${({ $done }) => ($done ? 'line-through' : 'none')};
`;

const ClosedText = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 700;
`;

const Note = styled.Text<{ $ruled?: boolean }>`
  color: ${({ theme }) => theme.colors.onAccentSubtle};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
  border-top-width: ${({ $ruled }) => ($ruled ? 1.5 : 0)}px;
  border-top-color: ${({ theme }) => theme.colors.onAccentLine};
  padding-top: ${({ theme, $ruled }) =>
    $ruled ? theme.spacing.small + 4 : theme.spacing.tiny}px;
  padding-bottom: ${({ theme }) => theme.spacing.tiny}px;
`;

/** The one control that decides something inverts ink and sun. The ground is
 * `onAccent`, not `text`: `text` turns cream in the dark theme and the yellow
 * label would sit on it at 1.4:1. What is written on Sol does not change
 * between modes, and neither does what Sol is written on. */
const TakeOne = styled(PressableScale)`
  align-self: stretch;
  min-height: 48px;
  align-items: center;
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
