import { Switch } from 'react-native';
import Animated from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { contentEnter } from '../../../../app/animation/motion';
import { dayCapacities } from '../../../../app/domain/AppPreferences';
import type { AppearanceMode } from '../../../../app/theme/theme';
import type { AuthCopy } from '../../../auth/presentation/localization/authCopy';
import {
  appLanguages,
  type AppLanguage,
  type TaskCopy,
} from '../localization/taskCopy';
import { PressableScale } from '../views/PressableScale';

interface SettingsScreenProps {
  accountCopy: AuthCopy;
  appearanceMode: AppearanceMode;
  copy: TaskCopy;
  dayCapacity: number;
  language: AppLanguage;
  /** The uid: with no account there is nothing to sign out of. */
  personId: string | null;
  version: string;
  /** Whether a shared project may notify. On by default. */
  projectActivityNotifications: boolean;
  /** True when the system itself is refusing the alerts. Null while it has not
   * answered yet, and then nothing is claimed either way. */
  projectActivityBlocked: boolean;
  onProjectActivityNotificationsChange: (enabled: boolean) => void;
  onOpenNotificationSettings: () => void;
  onAppearanceModeChange: (mode: AppearanceMode) => void;
  onDayCapacityChange: (capacity: number) => void;
  onLanguageChange: (language: AppLanguage) => void;
  onSignOut: () => void;
  /** Opens the first-run walk-through again, without touching any data. */
  onReplayOnboarding: () => void;
}

const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  'pt-BR': 'Português',
  'en-US': 'English',
};

export function SettingsScreen({
  accountCopy,
  appearanceMode,
  copy,
  dayCapacity,
  language,
  personId,
  version,
  projectActivityNotifications,
  projectActivityBlocked,
  onProjectActivityNotificationsChange,
  onOpenNotificationSettings,
  onAppearanceModeChange,
  onDayCapacityChange,
  onLanguageChange,
  onSignOut,
  onReplayOnboarding,
}: SettingsScreenProps) {
  const theme = useTheme();

  return (
    <Content>
      <Group entering={contentEnter(1)}>
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

      <Group entering={contentEnter(2)}>
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

      <Group entering={contentEnter(3)}>
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

      {/* News from a shared project, and the only place to turn it off. The
          section is a label, a row and a note — no box of its own. */}
      <Group entering={contentEnter(3)}>
        <GroupLabel>{copy.projectActivity.settingsLabel}</GroupLabel>
        <ToggleRow>
          <ToggleLabel>{copy.projectActivity.settingsToggle}</ToggleLabel>
          <Switch
            accessibilityLabel={copy.projectActivity.settingsToggle}
            accessibilityRole="switch"
            accessibilityState={{ checked: projectActivityNotifications }}
            onValueChange={onProjectActivityNotificationsChange}
            testID="settings-project-activity"
            thumbColor={theme.colors.card}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.accent,
            }}
            value={projectActivityNotifications}
          />
        </ToggleRow>
        {projectActivityNotifications && projectActivityBlocked ? (
          // The switch is on and the system is the one holding the alerts
          // back: saying so is the difference between a setting that works and
          // one that lies. Informative, and with the only way out next to it.
          <BlockedRow
            accessibilityHint={copy.projectActivity.blockedNote}
            accessibilityLabel={`${copy.projectActivity.blockedNote}, ${copy.projectActivity.blockedAction}`}
            accessibilityRole="button"
            onPress={onOpenNotificationSettings}
            testID="settings-project-activity-blocked"
          >
            <BlockedText>
              {`${copy.projectActivity.blockedNote} · `}
              <BlockedAction>
                {copy.projectActivity.blockedAction}
              </BlockedAction>
            </BlockedText>
          </BlockedRow>
        ) : (
          <GroupNote>
            {projectActivityNotifications
              ? copy.projectActivity.settingsHint
              : copy.projectActivity.settingsHintOff}
          </GroupNote>
        )}
      </Group>

      <Group entering={contentEnter(3)}>
        <ReplayRow
          accessibilityHint={copy.settings.replayOnboardingHint}
          accessibilityLabel={copy.settings.replayOnboarding}
          accessibilityRole="button"
          onPress={onReplayOnboarding}
          testID="settings-replay-onboarding"
        >
          <ReplayLabel>{copy.settings.replayOnboarding}</ReplayLabel>
        </ReplayRow>
        <GroupNote>{copy.settings.replayOnboardingHint}</GroupNote>
      </Group>

      <Group entering={contentEnter(3)}>
        <GroupLabel>{copy.settings.about}</GroupLabel>
        <About>{copy.settings.version(version)}</About>
      </Group>

      {/* The way out of the account, last: it is the end of the tab, not
          something to meet on the way in. */}
      {personId == null ? null : (
        <Group entering={contentEnter(3)}>
          <SignOutButton
            accessibilityLabel={accountCopy.account.signOut}
            onPress={onSignOut}
            testID="settings-sign-out"
          >
            <SignOutLabel>{accountCopy.account.signOut}</SignOutLabel>
          </SignOutButton>
        </Group>
      )}
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

const Group = styled(Animated.View)`
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

const ToggleRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.small}px;
  min-height: 48px;
`;

const ToggleLabel = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;

/* Same weight as the note it replaces: a line of type with the way out in it,
   not a warning box. */
const BlockedRow = styled(PressableScale)`
  min-height: 44px;
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.tiny}px;
`;

const BlockedText = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  line-height: 18px;
`;

const BlockedAction = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-weight: 700;
`;

const ReplayRow = styled(PressableScale)`
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const ReplayLabel = styled.Text`
  color: ${({ theme }) => theme.colors.text};
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

const SignOutButton = styled(PressableScale)`
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
  padding: 13px 0px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const SignOutLabel = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;
