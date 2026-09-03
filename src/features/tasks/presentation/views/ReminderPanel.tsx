import styled from 'styled-components/native';

import type { TaskCopy } from '../localization/taskCopy';
import { PressableScale } from './PressableScale';

interface ReminderPanelProps {
  copy: TaskCopy;
  /** Every lead time this deadline leaves room for, in whole days. Empty when
   * the deadline is today or already past. */
  options: readonly number[];
  selected: number | null;
  /** True once the phone has refused notifications: the choice is still
   * honoured and saved, and the panel says what is off. */
  blocked: boolean;
  onSelect: (days: number | null) => void;
  onOpenSettings: () => void;
}

/**
 * How long before the deadline the phone should say something.
 *
 * One list, one tap: "no reminder" sits with the days rather than behind a
 * switch, so turning it off costs exactly what turning it on did. Nothing here
 * offers a day the deadline cannot hold — the caller has already worked out
 * which ones fit.
 */
export function ReminderPanel({
  copy,
  options,
  selected,
  blocked,
  onSelect,
  onOpenSettings,
}: ReminderPanelProps) {
  const reminder = copy.capture.reminder;

  if (options.length === 0) {
    return (
      <Panel>
        <Hint>{reminder.tooLateHint}</Hint>
      </Panel>
    );
  }

  return (
    <Panel>
      <Options>
        <Option
          $active={selected == null}
          accessibilityLabel={reminder.noReminder}
          accessibilityRole="button"
          accessibilityState={{ selected: selected == null }}
          onPress={() => onSelect(null)}
          testID="reminder-option-none"
        >
          <OptionText $active={selected == null}>
            {reminder.noReminder}
          </OptionText>
        </Option>

        {options.map(days => {
          const isChosen = days === selected;

          return (
            <Option
              $active={isChosen}
              accessibilityLabel={reminder.daysBefore(days)}
              accessibilityRole="button"
              accessibilityState={{ selected: isChosen }}
              key={days}
              onPress={() => onSelect(days)}
              testID={`reminder-option-${days}`}
            >
              <OptionText $active={isChosen}>
                {reminder.daysBefore(days)}
              </OptionText>
            </Option>
          );
        })}
      </Options>

      {blocked ? (
        <Blocked>
          <Hint>{reminder.blockedHint}</Hint>
          <Settings
            accessibilityLabel={reminder.openSettings}
            accessibilityRole="button"
            onPress={onOpenSettings}
            testID="reminder-open-settings"
          >
            <SettingsText>{reminder.openSettings}</SettingsText>
          </Settings>
        </Blocked>
      ) : null}
    </Panel>
  );
}

const Panel = styled.View`
  margin-top: ${({ theme }) => theme.spacing.medium}px;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

const Options = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.small - 2}px;
`;

/* Same shape as the list options above it: one language for "pick one of
   these", used twice. */
const Option = styled(PressableScale)<{ $active: boolean }>`
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.accent : theme.colors.border};
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors.card : 'transparent'};
`;

const OptionText = styled.Text<{ $active: boolean }>`
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: ${({ $active }) => ($active ? 800 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text : theme.colors.mutedStrong};
`;

const Blocked = styled.View`
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

/* A statement, not an alarm: it carries no colour of its own. */
const Hint = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  flex-shrink: 1;
`;

const Settings = styled(PressableScale)`
  min-height: 48px;
  align-items: center;
  justify-content: center;
  padding: 0px ${({ theme }) => theme.spacing.small}px;
`;

const SettingsText = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
`;
