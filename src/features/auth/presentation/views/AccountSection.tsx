import { useEffect, useState } from 'react';
import Animated from 'react-native-reanimated';
import styled from 'styled-components/native';

import {
  contentEnter,
  fadeEnter,
  fadeExit,
} from '../../../../app/animation/motion';
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
  /** The uid, so the row only exists once there is an account. */
  personId: string | null;
  /** True right after a save, for the confirmation line. */
  profileSaved: boolean;
  isAnonymous: boolean;
  onEditProfile: () => void;
}

const AVATAR = 56;

/**
 * The first thing the Você tab shows: who this account is.
 *
 * It carries the tab's own header, because the identity is the heading here —
 * numbers and settings follow it. No surface of its own: the avatar, the name
 * and the space around them are what group it. The level line under the name
 * is drawn by the progress block, which owns that number.
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
  const name = profile?.displayName ?? tabLabel;

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
              name,
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
              <Avatar name={name} photoURL={profile?.photoURL ?? null} />
              <IdentityText>
                <AccountName numberOfLines={1} ellipsizeMode="tail">
                  {name}
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

/** The person's own picture: the initial on coral, or the photo over it
 * until the photo has actually arrived. */
function Avatar({ name, photoURL }: { name: string; photoURL: string | null }) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [photoURL]);

  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <AvatarDisc
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AvatarInitial>{initial}</AvatarInitial>
      {photoURL == null || broken ? null : (
        <AvatarPhoto
          accessibilityIgnoresInvertColors
          onError={() => setBroken(true)}
          resizeMode="cover"
          source={{ uri: photoURL }}
          testID="account-photo"
        />
      )}
    </AvatarDisc>
  );
}

const Content = styled.View`
  padding: 0px ${({ theme }) => theme.spacing.large}px;
`;

/* No air below: the progress block's first line belongs to this identity. */
const Group = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const IdentityRow = styled(PressableScale)`
  min-height: ${AVATAR}px;
  justify-content: center;
`;

/** The row itself: `PressableScale` puts its children inside an animated view
 * of its own, so the layout has to live below that, not on the pressable. */
const IdentityContent = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 14px;
  min-height: ${AVATAR}px;
`;

const AvatarDisc = styled.View`
  width: ${AVATAR}px;
  height: ${AVATAR}px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.projectCoral};
`;

const AvatarInitial = styled.Text`
  color: ${({ theme }) => theme.colors.card};
  font-size: 22px;
  font-weight: 800;
`;

const AvatarPhoto = styled.Image`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
`;

const IdentityText = styled.View`
  flex: 1;
  min-width: 0px;
`;

const AccountName = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.title}px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: ${({ theme }) => theme.type.title}px;
`;

const AccountHandle = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 500;
  line-height: 18px;
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
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const AccountNote = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
  line-height: 18px;
`;
