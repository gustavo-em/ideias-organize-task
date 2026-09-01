import { useEffect, useRef, useState } from 'react';
import { BackHandler, Modal } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { useSheetOpenTrace } from '../../../../app/perf/sheetPerf';
import {
  buttonTextAttrs,
  buttonTextMetrics,
} from '../../../../app/theme/buttonText';

import type { ShareErrorKind } from '../../domain/ShareError';
import {
  buildInviteLink,
  canEdit,
  type ListRole,
  type TaskList,
} from '../../domain/TaskList';
import { STAGGER_MS } from '../animation/motion';
import type { TaskCopy } from '../localization/taskCopy';
import { ConfirmDialog } from './ConfirmDialog';
import { CheckGlyph, LinkGlyph } from './FieldGlyphs';
import { memberDisplayName } from '../models/memberIdentity';
import { MemberChip } from './MemberChip';
import { PressableScale } from './PressableScale';
import {
  SheetActionsRow,
  SheetActionsSpacer,
  SheetCancelButton,
  SheetPrimaryButton,
} from './SheetActions';

type ShareStatus = 'idle' | 'loading' | 'error';

interface ShareSheetProps {
  copy: TaskCopy;
  list: TaskList;
  personId: string;
  /** How the signed-in account names itself right now. Their own row reads
   * from this, never from what the project recorded before the profile
   * existed. */
  identity: {
    personId: string;
    name: string;
    handle: string | null;
  } | null;
  status: ShareStatus;
  errorKind: ShareErrorKind | null;
  onCancel: () => void;
  onCreateLink: (invitedAs: Exclude<ListRole, 'owner'>) => void;
  onChangeInvitedAs: (invitedAs: Exclude<ListRole, 'owner'>) => void;
  onCopyLink: (token: string) => void;
  onInvite: (token: string) => void;
  onRemoveMember: (personId: string) => void;
  onStopSharing: () => void;
}

/**
 * Turning a project into a group, and reading who is in it.
 *
 * Same shell as `ProjectEditorSheet`: only the middle changes. The link is
 * revealed only after it exists — before that, the one thing on the sheet is
 * the button that creates it.
 */
export function ShareSheet({
  copy,
  list,
  personId,
  identity,
  status,
  errorKind,
  onCancel,
  onCreateLink,
  onChangeInvitedAs,
  onCopyLink,
  onInvite,
  onRemoveMember,
  onStopSharing,
}: ShareSheetProps) {
  const theme = useTheme();
  const traceOpen = useSheetOpenTrace('ShareSheet');
  const [invitedAs, setInvitedAs] = useState<Exclude<ListRole, 'owner'>>(
    list.share?.invitedAs ?? 'editor',
  );
  const [justCopied, setJustCopied] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState<{
    personId: string;
    name: string;
  } | null>(null);
  const [confirmingStop, setConfirmingStop] = useState(false);
  const lastAction = useRef<() => void>(() => onCreateLink(invitedAs));
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const viewer = list.share != null && !canEdit(list, personId);
  const members = list.share?.members ?? [];
  // Managing the invite (role, members, stopping the share) is the owner's
  // job; an editor edits tasks but does not run the group.
  const isOwner =
    list.share == null ||
    members.find(member => member.personId === personId)?.role === 'owner';

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onCancel();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onCancel]);

  useEffect(
    () => () => {
      if (copiedTimer.current != null) clearTimeout(copiedTimer.current);
    },
    [],
  );

  function handleCreateLink() {
    lastAction.current = () => onCreateLink(invitedAs);
    onCreateLink(invitedAs);
  }

  function handleCopy() {
    if (list.share == null) return;

    onCopyLink(list.share.token);
    setJustCopied(true);
    if (copiedTimer.current != null) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setJustCopied(false), 1200);
  }

  function handleChangeInvitedAs(next: Exclude<ListRole, 'owner'>) {
    setInvitedAs(next);
    if (list.share != null) onChangeInvitedAs(next);
  }

  // A refusal is not a connection problem: saying "check the internet" when
  // the server said no sends the person to fix the wrong thing.
  const errorMessage =
    errorKind === 'network'
      ? copy.lists.noNetwork
      : errorKind === 'invalid-invite'
      ? copy.lists.invalidInvite
      : errorKind === 'forbidden' || errorKind === 'unknown'
      ? copy.lists.shareRefused
      : null;

  return (
    <Modal
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible
    >
      <Overlay>
        <Scrim entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)}>
          <ScrimTouch
            accessibilityLabel={copy.capture.cancel}
            accessibilityRole="button"
            onPress={onCancel}
          />
        </Scrim>
        <Sheet
          entering={SlideInDown.springify().damping(20).stiffness(200)}
          exiting={SlideOutDown.duration(180)}
          onLayout={traceOpen}
          testID="share-sheet"
        >
          <Grabber />
          <Title accessibilityRole="header">
            {`${copy.lists.share} ${list.name}`}
          </Title>
          <Hint>{copy.lists.shareHint}</Hint>

          {list.share == null ? (
            <SheetPrimaryButton
              block
              disabled={status === 'loading'}
              label={
                status === 'loading'
                  ? copy.lists.creatingLink
                  : copy.lists.createLink
              }
              onPress={handleCreateLink}
              testID="share-create-link"
            />
          ) : (
            <>
              <LinkRow accessibilityRole="text">
                <LinkGlyph color={theme.colors.accentInk} size={16} />
                <LinkText>{buildInviteLink(list.share.token)}</LinkText>
                <CopyButton
                  accessibilityLabel={copy.lists.copyLinkAccessible}
                  hitSlop={8}
                  onPress={handleCopy}
                  testID="share-copy-link"
                >
                  <CopyText>
                    {justCopied ? copy.lists.linkCopied : copy.lists.copyLink}
                  </CopyText>
                </CopyButton>
              </LinkRow>

              {!isOwner ? null : (
                <>
                  <SectionLabel>{copy.lists.invitedAsLabel}</SectionLabel>
                  <RoleRow>
                    <RoleButton
                      $selected={invitedAs === 'viewer'}
                      accessibilityLabel={copy.lists.roleViewer}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: invitedAs === 'viewer' }}
                      onPress={() => handleChangeInvitedAs('viewer')}
                    >
                      <RoleContent>
                        {invitedAs === 'viewer' ? (
                          <RoleCheck>
                            <CheckGlyph
                              color={theme.colors.accentInk}
                              size={14}
                            />
                          </RoleCheck>
                        ) : null}
                        <RoleButtonText
                          $selected={invitedAs === 'viewer'}
                          numberOfLines={1}
                        >
                          {copy.lists.roleViewer}
                        </RoleButtonText>
                      </RoleContent>
                    </RoleButton>
                    <RoleButton
                      $selected={invitedAs === 'editor'}
                      accessibilityLabel={copy.lists.roleEditor}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: invitedAs === 'editor' }}
                      onPress={() => handleChangeInvitedAs('editor')}
                    >
                      <RoleContent>
                        {invitedAs === 'editor' ? (
                          <RoleCheck>
                            <CheckGlyph
                              color={theme.colors.accentInk}
                              size={14}
                            />
                          </RoleCheck>
                        ) : null}
                        <RoleButtonText
                          $selected={invitedAs === 'editor'}
                          numberOfLines={1}
                        >
                          {copy.lists.roleEditor}
                        </RoleButtonText>
                      </RoleContent>
                    </RoleButton>
                  </RoleRow>
                  <Note>{copy.lists.roleChangeNote}</Note>
                </>
              )}

              <SectionLabel>{`${copy.lists.membersHeader.toUpperCase()} · ${
                members.length
              }`}</SectionLabel>
              {members.map((member, index) => {
                // The logged-in person is "Você" in their own list of
                // members; everybody else is the name and handle they chose.
                // The session's own uid, however the row got here: an entry
                // recorded before the profile existed is still this person.
                const isMe =
                  member.personId === personId ||
                  member.personId === identity?.personId;
                const displayName = isMe
                  ? copy.lists.memberYou
                  : memberDisplayName(member, copy.lists.memberSomeone);
                const handle = isMe ? identity?.handle ?? null : member.handle;

                return (
                  <MemberRow
                    entering={FadeInDown.delay(index * STAGGER_MS).duration(
                      280,
                    )}
                    key={member.personId}
                    $last={index === members.length - 1}
                  >
                    <MemberChip
                      initials={isMe ? copy.lists.memberYouInitials : undefined}
                      name={displayName}
                      personId={member.personId}
                      pending={!member.joined}
                      size="large"
                    />
                    <MemberInfo>
                      <MemberName numberOfLines={1} ellipsizeMode="tail">
                        {displayName}
                      </MemberName>
                      {isMe && identity != null ? (
                        <MemberSub numberOfLines={1} ellipsizeMode="tail">
                          {handle == null
                            ? identity.name
                            : `${identity.name} · @${handle}`}
                        </MemberSub>
                      ) : handle == null ? null : (
                        <MemberSub numberOfLines={1} ellipsizeMode="tail">
                          {`@${handle}`}
                        </MemberSub>
                      )}
                      {member.joined ? null : (
                        <MemberSub>{copy.lists.pendingInvite}</MemberSub>
                      )}
                    </MemberInfo>
                    {member.role === 'owner' ? (
                      <RoleTag>{copy.lists.roleOwner}</RoleTag>
                    ) : (
                      <RoleTag>
                        {member.role === 'editor'
                          ? copy.lists.roleEditor
                          : copy.lists.roleViewer}
                      </RoleTag>
                    )}
                    {isOwner && !isMe ? (
                      <RemoveButton
                        accessibilityLabel={copy.lists.removeMember(
                          displayName,
                        )}
                        hitSlop={14}
                        onPress={() =>
                          setConfirmingRemove({
                            personId: member.personId,
                            name: displayName,
                          })
                        }
                      >
                        <RemoveText>{copy.lists.removeMemberLabel}</RemoveText>
                      </RemoveButton>
                    ) : null}
                  </MemberRow>
                );
              })}
            </>
          )}

          {errorMessage == null ? null : (
            <ErrorBanner>
              <ErrorText>{errorMessage}</ErrorText>
              <RetryButton
                accessibilityLabel={copy.lists.tryAgain}
                hitSlop={12}
                onPress={() => lastAction.current()}
              >
                <RetryText>{copy.lists.tryAgain}</RetryText>
              </RetryButton>
            </ErrorBanner>
          )}

          <SheetActionsRow>
            {isOwner && list.share != null ? (
              <StopLink
                accessibilityLabel={copy.lists.stopSharing}
                onPress={() => setConfirmingStop(true)}
              >
                <StopLinkText>{copy.lists.stopSharing}</StopLinkText>
              </StopLink>
            ) : null}
            <SheetActionsSpacer />
            <SheetCancelButton label={copy.capture.cancel} onPress={onCancel} />
            {viewer || list.share == null ? null : (
              <SheetPrimaryButton
                label={copy.lists.invite}
                onPress={() => onInvite(list.share!.token)}
                testID="share-invite"
              />
            )}
          </SheetActionsRow>
        </Sheet>
      </Overlay>

      {confirmingRemove == null ? null : (
        <ConfirmDialog
          cancelLabel={copy.today.removeCancel}
          confirmLabel={copy.today.remove}
          destructive
          onCancel={() => setConfirmingRemove(null)}
          onConfirm={() => {
            lastAction.current = () =>
              onRemoveMember(confirmingRemove.personId);
            onRemoveMember(confirmingRemove.personId);
            setConfirmingRemove(null);
          }}
          testID="share-remove-member-confirm"
          title={copy.lists.removeMemberConfirm(confirmingRemove.name)}
        />
      )}

      {!confirmingStop ? null : (
        <ConfirmDialog
          body={copy.lists.stopSharingConfirm}
          cancelLabel={copy.today.removeCancel}
          confirmLabel={copy.lists.stopSharing}
          destructive
          onCancel={() => setConfirmingStop(false)}
          onConfirm={() => {
            lastAction.current = () => onStopSharing();
            onStopSharing();
            setConfirmingStop(false);
          }}
          testID="share-stop-sharing-confirm"
          title={copy.lists.stopSharing}
        />
      )}
    </Modal>
  );
}

const Overlay = styled.View`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  justify-content: flex-end;
  z-index: 35;
`;

const Scrim = styled(Animated.View)`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  background-color: ${({ theme }) => theme.colors.scrim};
`;

const ScrimTouch = styled.Pressable`
  flex: 1;
`;

const Sheet = styled(Animated.View)`
  background-color: ${({ theme }) => theme.colors.background};
  border-top-left-radius: ${({ theme }) => theme.radii.extraLarge}px;
  border-top-right-radius: ${({ theme }) => theme.radii.extraLarge}px;
  margin-bottom: -80px;
  max-height: 91%;
  padding: ${({ theme }) => theme.spacing.medium}px
    ${({ theme }) => theme.spacing.large}px
    ${({ theme }) => theme.spacing.large + 88}px;
`;

const Grabber = styled.View`
  width: 36px;
  height: 4px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.border};
  align-self: center;
  margin-bottom: ${({ theme }) => theme.spacing.medium}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.heading}px;
  font-weight: 800;
  letter-spacing: -0.4px;
`;

const Hint = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const LinkRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small + 2}px;
  border: 2px solid ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.card};
  padding: 13px 14px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const LinkText = styled.Text.attrs({ numberOfLines: 1 })`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  font-variant: tabular-nums;
`;

const CopyButton = styled(PressableScale)`
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const CopyText = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;

const SectionLabel = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const RoleRow = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const RoleButton = styled(PressableScale)<{ $selected: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.tiny + 2}px;
  min-height: 48px;
  padding: 0px 14px;
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.accent : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.cardElevated : theme.colors.card};
`;

/** `PressableScale` hands the style to the `Pressable` and keeps the children
 * inside an `Animated.View` of its own, so the row has to be declared here:
 * on the pill itself it would only lay out that single wrapper. */
const RoleContent = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.tiny + 2}px;
  min-height: 48px;
`;

/** The check keeps its own square so the pill never wraps the word to a
 * second line: a role reads on one line or it is not a pill. */
const RoleCheck = styled.View`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
`;

const RoleButtonText = styled.Text<{ $selected: boolean }>`
  flex-shrink: 0;
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.accentInk : theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  font-weight: 800;
`;

const Note = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const MemberRow = styled(Animated.View)<{ $last: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small + 4}px;
  min-height: 48px;
  padding: ${({ theme }) => theme.spacing.small + 4}px 0px;
  border-bottom-width: ${({ $last }) => ($last ? 0 : 1)}px;
  border-bottom-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const MemberInfo = styled.View`
  flex: 1;
`;

const MemberName = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 700;
`;

const MemberSub = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
`;

const RoleTag = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
`;

const RemoveButton = styled(PressableScale)`
  padding: ${({ theme }) => theme.spacing.tiny}px;
`;

const RemoveText = styled.Text`
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;

const ErrorBanner = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.small}px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  padding: ${({ theme }) => theme.spacing.small + 4}px
    ${({ theme }) => theme.spacing.medium}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const ErrorText = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
`;

const RetryButton = styled(PressableScale)`
  padding: 8px 12px;
`;

const RetryText = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
`;

const StopLink = styled(PressableScale)`
  min-height: 48px;
  justify-content: center;
  padding: 0px ${({ theme }) => theme.spacing.small}px;
`;

const StopLinkText = styled.Text.attrs(buttonTextAttrs)`
  color: ${({ theme }) => theme.colors.danger};
  ${({ theme }) => buttonTextMetrics(theme.type.label)}
  font-weight: 700;
`;
