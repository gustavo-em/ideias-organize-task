import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import styled from 'styled-components/native';

import { dayCapacities } from '../../../../app/domain/AppPreferences';
import type { AppearanceMode } from '../../../../app/theme/theme';
import type { AuthCopy } from '../../../auth/presentation/localization/authCopy';
import {
  appLanguages,
  type AppLanguage,
  type TaskCopy,
} from '../localization/taskCopy';
import { MemberChip } from '../views/MemberChip';
import { PressableScale } from '../views/PressableScale';

interface SettingsScreenProps {
  accountCopy: AuthCopy;
  appearanceMode: AppearanceMode;
  copy: TaskCopy;
  dayCapacity: number;
  language: AppLanguage;
  /** Who the account is, in the only two things anyone else sees. Null while
   * the profile has not been read yet. */
  profile: { displayName: string; handle: string | null } | null;
  /** The uid, so the chip's tone matches the one shown in shared projects. */
  personId: string | null;
  /** True right after a save, for the confirmation line. */
  profileSaved: boolean;
  isAnonymous: boolean;
  version: string;
  onAppearanceModeChange: (mode: AppearanceMode) => void;
  onDayCapacityChange: (capacity: number) => void;
  onLanguageChange: (language: AppLanguage) => void;
  onEditProfile: () => void;
  onSignOut: () => void;
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
  profile,
  personId,
  profileSaved,
  isAnonymous,
  version,
  onAppearanceModeChange,
  onDayCapacityChange,
  onLanguageChange,
  onEditProfile,
  onSignOut,
}: SettingsScreenProps) {
  return (
    <Content>
      <SectionTitle>{copy.settings.title}</SectionTitle>

      {/* The account is named by its profile, never by the e-mail it signs in
          with — and this group is still the only way to reach Sair. */}
      {personId == null ? null : (
        <Group>
          <GroupLabel>{accountCopy.account.label}</GroupLabel>
          <IdentityRow
            accessibilityHint={accountCopy.profile.subtitle}
            accessibilityLabel={`${profile?.displayName ?? copy.tabs.you}, ${
              accountCopy.profile.edit
            }`}
            accessibilityRole="button"
            onPress={onEditProfile}
            testID="settings-profile"
          >
            <IdentityContent>
              <MemberChip
                name={profile?.displayName ?? copy.tabs.you}
                personId={personId}
                size="large"
              />
              <IdentityText>
                <AccountName numberOfLines={1} ellipsizeMode="tail">
                  {profile?.displayName ?? copy.tabs.you}
                </AccountName>
                {profile?.handle == null ? null : (
                  <AccountHandle numberOfLines={1} ellipsizeMode="tail">
                    {`@${profile.handle}`}
                  </AccountHandle>
                )}
              </IdentityText>
              <EditLabel>{accountCopy.profile.edit}</EditLabel>
            </IdentityContent>
          </IdentityRow>
          {profileSaved ? (
            <SavedNote
              accessibilityLiveRegion="polite"
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(200)}
              testID="settings-profile-saved"
            >
              {accountCopy.profile.saved}
            </SavedNote>
          ) : null}
          {isAnonymous ? (
            <AccountNote>{accountCopy.anonymous.settingsNote}</AccountNote>
          ) : null}
          <SignOutButton
            accessibilityLabel={accountCopy.account.signOut}
            onPress={onSignOut}
            testID="settings-sign-out"
          >
            <SignOutLabel>{accountCopy.account.signOut}</SignOutLabel>
          </SignOutButton>
        </Group>
      )}

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

const IdentityRow = styled(PressableScale)`
  min-height: 56px;
  justify-content: center;
`;

/** The row itself: `PressableScale` puts its children inside an animated view
 * of its own, so the layout has to live below that, not on the pressable. */
const IdentityContent = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  min-height: 56px;
  padding: ${({ theme }) => theme.spacing.tiny}px 0px;
`;

const IdentityText = styled.View`
  flex: 1;
  min-width: 0px;
`;

const AccountName = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 700;
  line-height: ${({ theme }) => theme.type.body + 6}px;
`;

const AccountHandle = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
  margin-top: 2px;
`;

const EditLabel = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;

const SavedNote = styled(Animated.Text)`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
  margin-top: ${({ theme }) => theme.spacing.tiny}px;
`;

const AccountNote = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  margin-top: ${({ theme }) => theme.spacing.tiny}px;
  line-height: 18px;
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
