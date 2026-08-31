import styled from 'styled-components/native';

import { dayCapacities } from '../../../../app/domain/AppPreferences';
import type { AppearanceMode } from '../../../../app/theme/theme';
import {
  appLanguages,
  type AppLanguage,
  type TaskCopy,
} from '../localization/taskCopy';
import { PressableScale } from '../views/PressableScale';

interface SettingsScreenProps {
  appearanceMode: AppearanceMode;
  copy: TaskCopy;
  dayCapacity: number;
  language: AppLanguage;
  version: string;
  onAppearanceModeChange: (mode: AppearanceMode) => void;
  onDayCapacityChange: (capacity: number) => void;
  onLanguageChange: (language: AppLanguage) => void;
}

const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  'pt-BR': 'Português',
  'en-US': 'English',
};

export function SettingsScreen({
  appearanceMode,
  copy,
  dayCapacity,
  language,
  version,
  onAppearanceModeChange,
  onDayCapacityChange,
  onLanguageChange,
}: SettingsScreenProps) {
  return (
    <Content>
      <SectionTitle>{copy.settings.title}</SectionTitle>

      <Group>
        <GroupLabel>{copy.settings.dayCapacity}</GroupLabel>
        <Segmented>
          {dayCapacities.map(option => (
            <Segment
              $active={dayCapacity === option}
              accessibilityLabel={copy.settings.dayCapacityOption(option)}
              accessibilityState={{ selected: dayCapacity === option }}
              key={option}
              onPress={() => onDayCapacityChange(option)}
              testID={`capacity-${option}`}
            >
              <SegmentText $active={dayCapacity === option}>
                {copy.settings.dayCapacityOption(option)}
              </SegmentText>
            </Segment>
          ))}
        </Segmented>
        <GroupNote>{copy.settings.dayCapacityHint}</GroupNote>
      </Group>

      <Group>
        <GroupLabel>{copy.settings.appearance}</GroupLabel>
        <Segmented>
          {(['light', 'dark'] as const).map(mode => (
            <Segment
              $active={appearanceMode === mode}
              accessibilityLabel={
                mode === 'light' ? copy.settings.light : copy.settings.dark
              }
              accessibilityState={{ selected: appearanceMode === mode }}
              key={mode}
              onPress={() => onAppearanceModeChange(mode)}
              testID={`appearance-${mode}`}
            >
              <SegmentText $active={appearanceMode === mode}>
                {mode === 'light' ? copy.settings.light : copy.settings.dark}
              </SegmentText>
            </Segment>
          ))}
        </Segmented>
      </Group>

      <Group>
        <GroupLabel>{copy.settings.language}</GroupLabel>
        <Segmented>
          {appLanguages.map(option => (
            <Segment
              $active={language === option}
              accessibilityLabel={LANGUAGE_NAMES[option]}
              accessibilityState={{ selected: language === option }}
              key={option}
              onPress={() => onLanguageChange(option)}
              testID={`language-${option}`}
            >
              <SegmentText $active={language === option}>
                {LANGUAGE_NAMES[option]}
              </SegmentText>
            </Segment>
          ))}
        </Segmented>
      </Group>

      <Group>
        <GroupLabel>{copy.settings.about}</GroupLabel>
        <About>{copy.settings.version(version)}</About>
      </Group>
    </Content>
  );
}

const Content = styled.View`
  padding: ${({ theme }) => theme.spacing.medium}px
    ${({ theme }) => theme.spacing.large}px
    ${({ theme }) => theme.spacing.large}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const SectionTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.heading}px;
  font-weight: 800;
  letter-spacing: -0.5px;
`;

const Group = styled.View`
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const GroupLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  margin-bottom: ${({ theme }) => theme.spacing.small}px;
`;

const Segmented = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

const Segment = styled(PressableScale)<{ $active: boolean }>`
  flex: 1;
  align-items: center;
  padding: 13px 0px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.accent : theme.colors.border};
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors.accent : 'transparent'};
`;

const SegmentText = styled.Text<{ $active: boolean }>`
  color: ${({ theme, $active }) =>
    $active ? theme.colors.onAccent : theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;

const GroupNote = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
  line-height: 18px;
`;

const About = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
`;
