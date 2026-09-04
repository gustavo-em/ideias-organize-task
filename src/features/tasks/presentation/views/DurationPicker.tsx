import styled from 'styled-components/native';

import {
  clampFocusMinutes,
  MAX_FOCUS_MINUTES,
  MIN_FOCUS_MINUTES,
} from '../../domain/FocusSession';
import {
  buttonTextAttrs,
  buttonTextMetrics,
} from '../../../../app/theme/buttonText';
import type { TaskCopy } from '../localization/taskCopy';
import { PressableScale } from './PressableScale';

const PRESETS = [10, 25, 45, 60];
const STEP = 5;

interface DurationPickerProps {
  copy: TaskCopy;
  minutes: number;
  onChange: (minutes: number) => void;
}

/**
 * Picking how long the next block should run.
 *
 * Presets cover the common cases in one tap; the stepper is there for the
 * task that does not fit a round number, without ever letting the value
 * drift outside what the timer was built to hold.
 */
export function DurationPicker({
  copy,
  minutes,
  onChange,
}: DurationPickerProps) {
  const isCustom = !PRESETS.includes(minutes);

  return (
    <Wrapper accessibilityRole="radiogroup">
      <Chips>
        {PRESETS.map(preset => (
          <Chip
            accessibilityLabel={copy.capture.minutes(preset)}
            accessibilityRole="radio"
            accessibilityState={{ selected: preset === minutes }}
            key={preset}
            onPress={() => onChange(preset)}
            selected={preset === minutes}
            testID={`focus-duration-${preset}`}
          >
            <ChipText selected={preset === minutes}>{preset}</ChipText>
          </Chip>
        ))}
        <Chip
          accessibilityLabel={copy.focus.customDuration}
          accessibilityRole="radio"
          accessibilityState={{ selected: isCustom }}
          onPress={() => {
            if (!isCustom) onChange(clampFocusMinutes(minutes + STEP));
          }}
          selected={isCustom}
          testID="focus-duration-custom"
        >
          <ChipText selected={isCustom}>{copy.focus.customDuration}</ChipText>
        </Chip>
      </Chips>

      {isCustom ? (
        <Stepper testID="focus-duration-stepper">
          <StepButton
            accessibilityLabel={copy.focus.decreaseDuration}
            disabled={minutes <= MIN_FOCUS_MINUTES}
            hitSlop={8}
            onPress={() => onChange(clampFocusMinutes(minutes - STEP))}
            testID="focus-duration-decrease"
          >
            <StepText>–</StepText>
          </StepButton>
          <StepperValue accessibilityLiveRegion="polite">
            {copy.capture.minutes(minutes)}
          </StepperValue>
          <StepButton
            accessibilityLabel={copy.focus.increaseDuration}
            disabled={minutes >= MAX_FOCUS_MINUTES}
            hitSlop={8}
            onPress={() => onChange(clampFocusMinutes(minutes + STEP))}
            testID="focus-duration-increase"
          >
            <StepText>+</StepText>
          </StepButton>
        </Stepper>
      ) : null}
    </Wrapper>
  );
}

const Wrapper = styled.View`
  margin-top: ${({ theme }) => theme.spacing.small + 2}px;
`;

const Chips = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

/* The chosen one is solid ink; the rest are only an outline, so the choice is
   read at a glance and the yellow stays out of a screen that is not about
   the primary action yet. */
const Chip = styled(PressableScale)<{ selected: boolean }>`
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  border: 1px solid
    ${({ theme, selected }) =>
      selected ? theme.colors.text : theme.colors.border};
  background-color: ${({ theme, selected }) =>
    selected ? theme.colors.text : 'transparent'};
`;

const ChipText = styled.Text.attrs(buttonTextAttrs)<{ selected: boolean }>`
  ${({ theme }) => buttonTextMetrics(theme.type.label)}
  font-weight: 700;
  color: ${({ theme, selected }) =>
    selected ? theme.colors.background : theme.colors.text};
`;

const Stepper = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.medium}px;
  margin-top: ${({ theme }) => theme.spacing.small + 2}px;
`;

const StepButton = styled(PressableScale)`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  align-items: center;
  justify-content: center;
`;

const StepText = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 20px;
  font-weight: 800;
`;

const StepperValue = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 700;
  font-variant: tabular-nums;
  min-width: 72px;
  text-align: center;
`;
