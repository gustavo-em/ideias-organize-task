import { useCallback, useEffect, useRef, useState } from 'react';
import Animated from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import type { TaskCopy } from '../localization/taskCopy';
import type { SharedDayEntry, SharedDayStatus } from '../models/sharedDay';
import {
  contentEnter,
  fadeEnter,
  rowEnter,
} from '../../../../app/animation/motion';
import { CheckGlyph } from './FieldGlyphs';
import { memberDisplayName } from '../models/memberIdentity';
import { MemberChip } from './MemberChip';
import { PressableScale } from './PressableScale';
import { FocusGlyph } from './TabGlyphs';

/** How long the retry stays visibly busy, even when the server refuses in
 * milliseconds: shorter than this and the tap reads as ignored. */
const RETRY_FLOOR_MS = 600;

/** How long the label admits the second refusal before offering the plain
 * action again. Long enough to be read, short enough not to become the
 * button's name. */
const RETRY_SETTLED_MS = 4000;

interface SharedDayBandProps {
  copy: TaskCopy;
  /** Already ordered by `sharedDay`: focusing, open, done, absent. */
  entries: readonly SharedDayEntry[];
  /** Everyone published a day and every one of them is closed. */
  allDone: boolean;
  /** Days in a row where that happened. Shown only from two upwards. */
  streakDays: number;
  /** How much this band can vouch for what is on screen: read, unreachable,
   * or refused. `error` never borrows the words of a missing network. */
  status: SharedDayStatus;
  /** Absent when there is nothing for this person to take, or when they only
   * have reading rights. */
  onTakeOne?: () => void;
  /** Only offered on `error`: asking again is the whole recovery. Returning
   * the attempt lets the control say it is busy until the answer lands. */
  onRetry?: () => void | Promise<unknown>;
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
  status,
  onTakeOne,
  onRetry,
}: SharedDayBandProps) {
  const theme = useTheme();
  const offline = status === 'offline';
  const failed = status === 'error';
  // A tap that changes nothing on screen reads as a dead control: the label
  // itself carries the wait, so nothing has to spin.
  const [retrying, setRetrying] = useState(false);
  // A second refusal ends on the same screen the tap started from. The label
  // says so once, for a few seconds, so the person knows the app went and
  // asked instead of ignoring the tap.
  const [failedAgain, setFailedAgain] = useState(false);
  const statusRef = useRef(status);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  statusRef.current = status;

  useEffect(
    () => () => {
      if (settleRef.current != null) clearTimeout(settleRef.current);
    },
    [],
  );

  const handleRetry = useCallback(() => {
    if (onRetry == null || retrying) return;

    const attempt = onRetry();
    if (attempt == null) return;

    setFailedAgain(false);
    setRetrying(true);
    // Whatever the answer is, the label goes back to offering the action —
    // a second failure leaves the note above it saying what happened. The
    // floor is what makes an instant refusal readable: without it the label
    // flickers for a frame and the tap looks lost.
    Promise.all([
      attempt.catch(() => undefined),
      new Promise<void>(resolve => {
        setTimeout(() => resolve(), RETRY_FLOOR_MS);
      }),
    ]).then(() => {
      setRetrying(false);
      if (statusRef.current !== 'error') return;

      setFailedAgain(true);
      if (settleRef.current != null) clearTimeout(settleRef.current);
      settleRef.current = setTimeout(
        () => setFailedAgain(false),
        RETRY_SETTLED_MS,
      );
    });
  }, [onRetry, retrying]);

  const retryLabel = retrying
    ? copy.lists.dayBandRetrying
    : failedAgain
    ? copy.lists.dayBandRetryFailed
    : copy.lists.dayBandRetry;

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
    <Band entering={fadeEnter()} testID="shared-day-band">
      <Eyebrow>{copy.lists.dayBandTitle}</Eyebrow>

      {entries.length === 0 ? (
        // An empty day is only stated when it was actually read: with no
        // network, or with the request refused, the band says why it knows
        // nothing instead of claiming a day nobody took.
        <>
          {status === 'ok' ? (
            <Empty testID="shared-day-empty">{copy.lists.dayBandEmpty}</Empty>
          ) : null}
          {/* What the band is says nothing about today, so it holds even
              when the day could not be read — and that is the only state a
              person with a refused project ever sees. */}
          <EmptyHint $lead={status !== 'ok'} testID="shared-day-empty-hint">
            {copy.lists.dayBandEmptyHint}
          </EmptyHint>
        </>
      ) : allDone ? (
        <>
          <Row
            $first
            accessibilityLabel={copy.lists.dayBandAllDone(entries.length)}
            entering={contentEnter(0)}
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
            entering={rowEnter(index)}
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

      {failed ? (
        <>
          <Note
            $ruled={entries.length > 0 && (!allDone || streakDays < 2)}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            testID="shared-day-error"
          >
            {copy.lists.dayBandError}
          </Note>
          {onRetry == null ? null : (
            <Retry
              accessibilityLabel={retryLabel}
              accessibilityState={{ busy: retrying, disabled: retrying }}
              disabled={retrying}
              onPress={handleRetry}
              testID="shared-day-retry"
            >
              <RetryText>{retryLabel}</RetryText>
            </Retry>
          )}
        </>
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

/** Reaches back across the indent of the `Expanded` it sits in, so it starts at
 * the project's own rule — and stops where the cards under it stop. Running past
 * the right gutter made it read as a screen-wide banner belonging to no project
 * in particular. */
const Band = styled(Animated.View)`
  background-color: ${({ theme }) => theme.colors.accent};
  margin: ${({ theme }) => theme.spacing.medium}px 0px 0px -${({ theme }) => theme.spacing.medium}px;
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
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.body}px;
  line-height: ${({ theme }) => theme.type.body + 7}px;
  margin-top: ${({ theme }) => theme.spacing.small + 6}px;
`;

/** The one line that says what the band is for. Sits under the sentence, in
 * the size of a caption, so the two read as lead and explanation. */
const EmptyHint = styled.Text<{ $lead?: boolean }>`
  color: ${({ theme }) => theme.colors.onAccentSubtle};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
  margin-top: ${({ theme, $lead }) =>
    $lead ? theme.spacing.small + 6 : theme.spacing.tiny + 2}px;
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

/** Asking again is a repair, not the band's decision: text only, no ground of
 * its own, so it never competes with the one filled control below it. */
const Retry = styled(PressableScale)`
  align-self: flex-start;
  min-height: 48px;
  justify-content: center;
  padding-right: ${({ theme }) => theme.spacing.medium}px;
`;

const RetryText = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
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
