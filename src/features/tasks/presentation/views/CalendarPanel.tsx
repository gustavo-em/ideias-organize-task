import { useState } from 'react';
import styled from 'styled-components/native';

import { DAY_MS, endOfDay, isSameDay, startOfDay } from '../../domain/Day';
import type { AppLanguage, TaskCopy } from '../localization/taskCopy';
import { CALENDAR_NAMES } from '../models/dateLabel';
import { PressableScale } from './PressableScale';
import { PanelBox, PanelTitle } from './SheetPanel';

interface CalendarPanelProps {
  copy: TaskCopy;
  language: AppLanguage;
  nowMs: number;
  selectedMs: number | null;
  onSelect: (dueAtMs: number | null) => void;
}

/**
 * A month, drawn in the app's own hand.
 *
 * The system date picker is a dialog from another product: it arrives in the
 * platform's colours, its own type and its own shape, in the middle of a sheet
 * that has just been carefully composed. This one belongs to the app, behaves
 * the same on both platforms, and costs no native dependency.
 *
 * The three answers people actually give — today, tomorrow, no date — sit
 * above the grid, because most dates are one of those and nobody should have
 * to hunt for a number to say "tomorrow".
 */
export function CalendarPanel({
  copy,
  language,
  nowMs,
  selectedMs,
  onSelect,
}: CalendarPanelProps) {
  const names = CALENDAR_NAMES[language] ?? CALENDAR_NAMES['pt-BR'];
  const anchor = new Date(selectedMs ?? nowMs);
  const [month, setMonth] = useState(
    () => new Date(anchor.getFullYear(), anchor.getMonth(), 1),
  );

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leading = new Date(year, monthIndex, 1).getDay();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];

  for (let index = 0; index < cells.length; index += 7) {
    rows.push(cells.slice(index, index + 7));
  }

  function shiftMonth(step: number) {
    setMonth(new Date(year, monthIndex + step, 1));
  }

  return (
    <PanelBox>
      <PanelTitle>{copy.capture.datePanelTitle}</PanelTitle>
      <Quick>
        <QuickButton
          $active={selectedMs != null && isSameDay(selectedMs, nowMs)}
          accessibilityLabel={copy.capture.today}
          onPress={() => onSelect(endOfDay(nowMs))}
          testID="calendar-today"
        >
          <QuickText
            $active={selectedMs != null && isSameDay(selectedMs, nowMs)}
          >
            {copy.capture.today}
          </QuickText>
        </QuickButton>
        <QuickButton
          $active={selectedMs != null && isSameDay(selectedMs, nowMs + DAY_MS)}
          accessibilityLabel={copy.capture.tomorrow}
          onPress={() => onSelect(endOfDay(nowMs + DAY_MS))}
          testID="calendar-tomorrow"
        >
          <QuickText
            $active={
              selectedMs != null && isSameDay(selectedMs, nowMs + DAY_MS)
            }
          >
            {copy.capture.tomorrow}
          </QuickText>
        </QuickButton>
        <QuickButton
          $active={selectedMs == null}
          accessibilityLabel={copy.capture.noDate}
          onPress={() => onSelect(null)}
          testID="calendar-none"
        >
          <QuickText $active={selectedMs == null}>
            {copy.capture.noDate}
          </QuickText>
        </QuickButton>
      </Quick>

      <MonthBar>
        <Step
          accessibilityLabel={copy.capture.previousMonth}
          onPress={() => shiftMonth(-1)}
          testID="calendar-previous"
        >
          <StepGlyph>‹</StepGlyph>
        </Step>
        <MonthName>
          {names.months[monthIndex]} {year}
        </MonthName>
        <Step
          accessibilityLabel={copy.capture.nextMonth}
          onPress={() => shiftMonth(1)}
          testID="calendar-next"
        >
          <StepGlyph>›</StepGlyph>
        </Step>
      </MonthBar>

      <Week>
        {copy.progress.weekdays.map((initial, index) => (
          <WeekDay key={`${initial}-${index}`}>{initial}</WeekDay>
        ))}
      </Week>

      {rows.map((row, rowIndex) => (
        <Row key={rowIndex}>
          {row.map((day, dayIndex) => {
            if (day == null) return <Empty key={`empty-${dayIndex}`} />;

            const dayMs = new Date(year, monthIndex, day).getTime();
            const isToday = isSameDay(dayMs, nowMs);
            const isChosen = selectedMs != null && isSameDay(dayMs, selectedMs);
            const isPast = startOfDay(dayMs) < startOfDay(nowMs);

            return (
              <Day
                $chosen={isChosen}
                $today={isToday}
                accessibilityLabel={`${day} ${names.months[monthIndex]}`}
                accessibilityState={{ selected: isChosen }}
                key={day}
                onPress={() => onSelect(endOfDay(dayMs))}
                scaleTo={0.86}
                testID={`calendar-day-${day}`}
              >
                <DayText $chosen={isChosen} $past={isPast}>
                  {day}
                </DayText>
              </Day>
            );
          })}
        </Row>
      ))}
    </PanelBox>
  );
}

const Quick = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

/* The same pill every panel answers with: chosen is ink, the rest are paper. */
const QuickButton = styled(PressableScale)<{ $active: boolean }>`
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.text : theme.colors.border};
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors.text : theme.colors.card};
`;

const QuickText = styled.Text<{ $active: boolean }>`
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.background : theme.colors.mutedStrong};
`;

const MonthBar = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Step = styled(PressableScale)`
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.pill}px;
`;

const StepGlyph = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 22px;
  line-height: 24px;
`;

const MonthName = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 800;
  letter-spacing: -0.3px;
  text-transform: capitalize;
`;

const Week = styled.View`
  flex-direction: row;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const WeekDay = styled.Text`
  flex: 1;
  text-align: center;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption - 1}px;
  font-weight: 700;
`;

const Row = styled.View`
  flex-direction: row;
  margin-top: 3px;
`;

const Empty = styled.View`
  flex: 1;
  height: 38px;
`;

const Day = styled(PressableScale)<{ $chosen: boolean; $today: boolean }>`
  flex: 1;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  border: 1.5px solid
    ${({ theme, $today, $chosen }) =>
      $chosen || !$today ? 'transparent' : theme.colors.recognizedText};
  background-color: ${({ theme, $chosen }) =>
    $chosen ? theme.colors.text : 'transparent'};
`;

const DayText = styled.Text<{ $chosen: boolean; $past: boolean }>`
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: ${({ $chosen }) => ($chosen ? 800 : 500)};
  color: ${({ theme, $chosen, $past }) =>
    $chosen
      ? theme.colors.background
      : $past
      ? theme.colors.muted
      : theme.colors.text};
`;
