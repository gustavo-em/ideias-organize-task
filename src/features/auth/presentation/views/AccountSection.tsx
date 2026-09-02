import Animated from 'react-native-reanimated';
import styled from 'styled-components/native';

import {
  contentEnter,
  fadeEnter,
  fadeExit,
} from '../../../../app/animation/motion';
import { MemberChip } from '../../../tasks/presentation/views/MemberChip';
import { PressableScale } from '../../../tasks/presentation/views/PressableScale';
import { ScreenHeader } from '../../../tasks/presentation/views/ScreenHeader';
import type { AuthCopy } from '../localization/authCopy';

interface AccountSectionProps {
  copy: AuthCopy;
  /** The eyebrow of the tab, and the name an account without a profile is
   * called by. */
  tabLabel: string;
  /** Who the account is, in the only two things anyone else sees. Null while
   * the profile has not been read yet. */
  profile: {
    displayName: string;
    handle: string | null;
    photoURL?: string | null;
  } | null;
  /** The uid, so the chip's tone matches the one shown in shared projects. */
  personId: string | null;
  /** True right after a save, for the confirmation line. */
  profileSaved: boolean;
  isAnonymous: boolean;
  onEditProfile: () => void;
}

/**
 * The first thing the Você tab shows: who this account is.
 *
 * It carries the tab's own header, because the identity is the heading here —
 * numbers and settings follow it. No surface of its own: the eyebrow, the rule
 * and the space around it are what group it.
 */
export function AccountSection({
  copy,
  tabLabel,
  profile,
  personId,
  profileSaved,
  isAnonymous,
  onEditProfile,
}: AccountSectionProps) {
  return (
    <Content>
      <ScreenHeader eyebrow={tabLabel} testID="you-header" />

      {personId == null ? null : (
        <Group entering={contentEnter(0)}>
          <IdentityRow
            accessibilityHint={copy.profile.subtitle}
            // A screen reader hears the same identity the row shows, handle
            // included: it is the new name of the person, not decoration.
            accessibilityLabel={[
              profile?.displayName ?? tabLabel,
              profile?.handle == null ? null : `@${profile.handle}`,
              copy.profile.edit,
            ]
              .filter(part => part != null)
              .join(', ')}
            accessibilityRole="button"
            onPress={onEditProfile}
            testID="settings-profile"
          >
            <IdentityContent>
              <MemberChip
                name={profile?.displayName ?? tabLabel}
                personId={personId}
                photoURL={profile?.photoURL ?? null}
                size="xlarge"
              />
              <IdentityText>
                <AccountName numberOfLines={1} ellipsizeMode="tail">
                  {profile?.displayName ?? tabLabel}
                </AccountName>
                {profile?.handle == null ? null : (
                  <AccountHandle numberOfLines={1} ellipsizeMode="tail">
                    {`@${profile.handle}`}
                  </AccountHandle>
                )}
              </IdentityText>
              <EditLabel>{copy.profile.edit}</EditLabel>
            </IdentityContent>
          </IdentityRow>
          {profileSaved ? (
            <SavedNote
              accessibilityLiveRegion="polite"
              entering={fadeEnter()}
              exiting={fadeExit()}
              testID="settings-profile-saved"
            >
              {copy.profile.saved}
            </SavedNote>
          ) : null}
          {isAnonymous ? (
            <AccountNote>{copy.anonymous.settingsNote}</AccountNote>
          ) : null}
        </Group>
      )}
    </Content>
  );
}

const Content = styled.View`
  padding: 0px ${({ theme }) => theme.spacing.large}px;
`;

/* The same air every other section of the tab gets below it: without it the
   account's note reads as the first line of the progress block. */
const Group = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.small}px;
  margin-bottom: ${({ theme }) => theme.spacing.large}px;
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
