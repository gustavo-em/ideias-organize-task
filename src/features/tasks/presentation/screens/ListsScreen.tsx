import { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { isCompleted, isOpen, type Task } from '../../domain/Task';
import { dayKeyOf } from '../../domain/SharedMemberDay';
import {
  canEdit,
  canShare,
  INBOX_LIST_ID,
  isShared,
  normalizeListName,
  type ListMember,
  type TaskList,
} from '../../domain/TaskList';
import type { AppLanguage, TaskCopy } from '../localization/taskCopy';
import {
  isGroupDayClosed,
  sharedDay,
  EMPTY_GROUP_STREAK,
} from '../models/sharedDay';
import type { TasksViewModel } from '../view-models/useTasksViewModel';
import { ConfirmDialog } from '../views/ConfirmDialog';
import {
  LinkGlyph,
  MoreGlyph,
  PeopleGlyph,
  PlusGlyph,
  ProjectGlyph,
} from '../views/FieldGlyphs';
import { FloatingAction } from '../views/FloatingAction';
import { JoinInviteSheet } from '../views/JoinInviteSheet';
import { ProjectEditorSheet } from '../views/ListNameSheet';
import { MemberStack } from '../views/MemberStack';
import { projectTone } from '../models/projectAppearance';
import { PressableScale } from '../views/PressableScale';
import { QuickCaptureSheet } from '../views/QuickCaptureSheet';
import { ScreenHeader } from '../views/ScreenHeader';
import { SharedDayBand } from '../views/SharedDayBand';
import { ShareSheet } from '../views/ShareSheet';
import { TaskCard } from '../views/TaskCard';

interface ListsScreenProps {
  copy: TaskCopy;
  language: AppLanguage;
  viewModel: TasksViewModel;
}

/** Lists hold the next steps of something bigger, opening in place for comparison. */
export function ListsScreen({ copy, language, viewModel }: ListsScreenProps) {
  const theme = useTheme();
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [creatingList, setCreatingList] = useState(false);
  const [renamingList, setRenamingList] = useState<TaskList | null>(null);
  const [deletingList, setDeletingList] = useState<TaskList | null>(null);
  const [capturingForList, setCapturingForList] = useState<TaskList | null>(
    null,
  );
  const [actionsForListId, setActionsForListId] = useState<string | null>(null);
  const [sharingList, setSharingList] = useState<TaskList | null>(null);
  const [leavingList, setLeavingList] = useState<TaskList | null>(null);
  const [joiningInvite, setJoiningInvite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const personId = viewModel.identity?.personId ?? null;

  useEffect(() => {
    viewModel.refreshAllSharedLists();
    // Only on the tab's first paint — the RefreshControl below covers every
    // pull after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePullRefresh() {
    setRefreshing(true);
    await viewModel.refreshAllSharedLists();
    setRefreshing(false);
  }

  function memberFor(list: TaskList, id: string | null): ListMember | null {
    if (id == null || list.share == null) return null;
    return list.share.members.find(member => member.personId === id) ?? null;
  }

  return (
    <Screen>
      <Content
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            onRefresh={handlePullRefresh}
            refreshing={refreshing}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow={copy.tabs.lists}
          subtitle={copy.lists.subtitle(
            viewModel.lists.length,
            viewModel.openTaskCount,
          )}
          title={copy.lists.title}
        />

        <JoinButton
          accessibilityLabel={copy.lists.joinInvite}
          onPress={() => setJoiningInvite(true)}
          testID="join-invite"
        >
          <LinkGlyph color={theme.colors.accentInk} size={14} />
          <JoinButtonText>{copy.lists.joinInvite}</JoinButtonText>
        </JoinButton>

        {viewModel.lists.map(list => {
          const tasks = viewModel.tasks.filter(task => task.listId === list.id);
          const done = tasks.filter(isCompleted).length;
          const isOpenList = openListId === list.id;
          const shared = list.share != null;
          const role = shared
            ? list.share!.members.find(member => member.personId === personId)
                ?.role ?? null
            : null;
          const isViewer = shared && !canEdit(list, personId ?? '');
          const canManageAppearance =
            list.id !== INBOX_LIST_ID && canEdit(list, personId ?? '');
          const canDeleteList = shared
            ? role === 'owner'
            : list.id !== INBOX_LIST_ID;
          const canLeave = shared && role !== 'owner';
          const canManage =
            list.id !== INBOX_LIST_ID &&
            (canShare(list) ||
              canManageAppearance ||
              canDeleteList ||
              canLeave);
          const showingActions = actionsForListId === list.id;
          // The band only ever describes today, and only for a project that
          // is actually shared.
          const dayEntries = shared
            ? sharedDay(
                list.share!.members,
                viewModel.sharedDays[list.id] ?? [],
                tasks,
                viewModel.nowMs,
              )
            : [];
          const tookSomethingToday = dayEntries.some(
            entry =>
              entry.member.personId === personId && entry.state !== 'absent',
          );

          return (
            <ListBlock key={list.id}>
              <ListHeader>
                <Row
                  accessibilityLabel={list.name}
                  accessibilityState={{ selected: isOpenList }}
                  onPress={() => {
                    setOpenListId(isOpenList ? null : list.id);
                    setActionsForListId(null);
                  }}
                  testID={`list-${list.id}`}
                >
                  <ProjectBadge $tone={projectTone(theme, list.color)}>
                    <ProjectGlyph
                      color={projectTone(theme, list.color)}
                      icon={list.icon}
                      size={18}
                    />
                  </ProjectBadge>
                  <Name numberOfLines={1}>{list.name}</Name>
                  {isShared(list) ? (
                    <MemberStack
                      members={list.share!.members}
                      sharedWithLabel={copy.lists.sharedWith(
                        list.share!.members.length,
                      )}
                    />
                  ) : null}
                  <Count>{copy.lists.progress(done, tasks.length)}</Count>
                  <Track>
                    <Fill
                      style={{
                        width: `${
                          tasks.length === 0 ? 0 : (done / tasks.length) * 100
                        }%`,
                      }}
                    />
                  </Track>
                </Row>
                {canManage ? (
                  <MoreButton
                    accessibilityLabel={copy.lists.moreActions(list.name)}
                    // Drawn at 38px, so the touch area is widened to the 48px
                    // the design guide asks for.
                    hitSlop={5}
                    onPress={() =>
                      setActionsForListId(showingActions ? null : list.id)
                    }
                    testID={`list-actions-${list.id}`}
                  >
                    <MoreGlyph color="#756b56" />
                  </MoreButton>
                ) : null}
              </ListHeader>

              {showingActions ? (
                <ListActions
                  entering={FadeIn.duration(150)}
                  testID="list-actions-open"
                >
                  {canShare(list) ? (
                    <ActionButton
                      accessibilityLabel={copy.lists.share}
                      onPress={() => {
                        setSharingList(list);
                        setActionsForListId(null);
                      }}
                      // Only one menu is open at a time, so the anchor does
                      // not need the generated project id to be unique.
                      testID="list-share"
                    >
                      <ActionText>{copy.lists.share}</ActionText>
                    </ActionButton>
                  ) : null}
                  {canManageAppearance ? (
                    <ActionButton
                      accessibilityLabel={copy.lists.rename}
                      onPress={() => {
                        setRenamingList(list);
                        setActionsForListId(null);
                      }}
                    >
                      <ActionText>{copy.lists.rename}</ActionText>
                    </ActionButton>
                  ) : null}
                  {canLeave ? (
                    <ActionButton
                      $danger
                      accessibilityLabel={copy.lists.leaveProject}
                      onPress={() => {
                        setLeavingList(list);
                        setActionsForListId(null);
                      }}
                    >
                      <ActionText $danger>{copy.lists.leaveProject}</ActionText>
                    </ActionButton>
                  ) : null}
                  {canDeleteList ? (
                    <ActionButton
                      $danger
                      accessibilityLabel={copy.lists.delete}
                      onPress={() => {
                        setDeletingList(list);
                        setActionsForListId(null);
                      }}
                    >
                      <ActionText $danger>{copy.lists.delete}</ActionText>
                    </ActionButton>
                  ) : null}
                </ListActions>
              ) : null}

              {isOpenList ? (
                <Expanded entering={FadeIn.duration(200)}>
                  {shared ? (
                    <SharedDayBand
                      allDone={isGroupDayClosed(
                        list.share!.members,
                        dayEntries,
                      )}
                      copy={copy}
                      entries={dayEntries}
                      offline={viewModel.sharedDayOffline[list.id] === true}
                      onTakeOne={
                        isViewer || tookSomethingToday
                          ? undefined
                          : () => setCapturingForList(list)
                      }
                      streakDays={
                        (viewModel.groupStreaks[list.id] ?? EMPTY_GROUP_STREAK)
                          .lastDayKey === dayKeyOf(viewModel.nowMs)
                          ? (
                              viewModel.groupStreaks[list.id] ??
                              EMPTY_GROUP_STREAK
                            ).days
                          : 0
                      }
                    />
                  ) : null}

                  {tasks.length === 0 ? (
                    shared ? (
                      <GroupEmpty>
                        <EmptyText>{copy.lists.groupEmpty}</EmptyText>
                        {list.share!.members.length <= 1 ? (
                          <InviteHighlight
                            accessibilityLabel={copy.lists.share}
                            onPress={() => setSharingList(list)}
                          >
                            <PeopleGlyph
                              color={theme.colors.accentInk}
                              size={16}
                            />
                            <InviteHighlightText>
                              {copy.lists.groupEmptyInvite}
                            </InviteHighlightText>
                          </InviteHighlight>
                        ) : null}
                      </GroupEmpty>
                    ) : (
                      <EmptyText>{copy.lists.empty}</EmptyText>
                    )
                  ) : null}

                  {tasks.length > 0 && shared && done === tasks.length ? (
                    <AllDoneBanner>
                      <AllDoneText>{copy.lists.groupAllDone}</AllDoneText>
                    </AllDoneBanner>
                  ) : null}

                  {tasks.map((task, index) => (
                    <TaskCard
                      action={
                        !isViewer && isOpen(task)
                          ? {
                              label: copy.lists.addToDay,
                              onPress: () => viewModel.moveIntoDay(task.id),
                            }
                          : undefined
                      }
                      completedByMember={
                        isCompleted(task) && task.completedBy !== personId
                          ? memberFor(list, task.completedBy ?? null)
                          : null
                      }
                      copy={copy}
                      disabled={isViewer}
                      index={index}
                      key={task.id}
                      listColor={null}
                      listIcon={null}
                      listName={null}
                      nowMs={viewModel.nowMs}
                      onDelete={isViewer ? undefined : () => setDeleting(task)}
                      onEdit={isViewer ? undefined : () => setEditing(task)}
                      onToggle={() => viewModel.toggle(task.id)}
                      task={task}
                    />
                  ))}
                  {isViewer ? null : (
                    <AddTaskButton
                      accessibilityLabel={
                        tasks.length === 0
                          ? copy.lists.addFirstTask
                          : copy.lists.addTask
                      }
                      onPress={() => setCapturingForList(list)}
                      testID={`add-task-${list.id}`}
                    >
                      <PlusGlyph color="#6d5314" />
                      <AddTaskText>
                        {tasks.length === 0
                          ? copy.lists.addFirstTask
                          : copy.lists.addTask}
                      </AddTaskText>
                    </AddTaskButton>
                  )}
                </Expanded>
              ) : null}
            </ListBlock>
          );
        })}
      </Content>

      {creatingList || renamingList != null ? null : (
        <FloatingAction
          label={copy.lists.newList}
          onPress={() => setCreatingList(true)}
          testID="new-list"
        />
      )}

      {creatingList ? (
        <ProjectEditorSheet
          copy={copy}
          onCancel={() => setCreatingList(false)}
          onSubmit={(name, appearance) => {
            const created = viewModel.createList(name, appearance);
            if (created != null) setOpenListId(created.id);
            return created != null;
          }}
          submitLabel={copy.lists.create}
          title={copy.lists.newList}
        />
      ) : null}
      {renamingList == null ? null : (
        <ProjectEditorSheet
          copy={copy}
          initialAppearance={renamingList}
          initialName={renamingList.name}
          onCancel={() => setRenamingList(null)}
          onSubmit={(name, appearance) =>
            normalizeListName(name) === normalizeListName(renamingList.name) ||
            viewModel.renameList(renamingList.id, name, appearance)
          }
          submitLabel={copy.lists.rename}
          title={copy.lists.renameList}
        />
      )}
      {capturingForList == null ? null : (
        <QuickCaptureSheet
          copy={copy}
          initialListId={capturingForList.id}
          language={language}
          lists={viewModel.lists}
          nowMs={viewModel.nowMs}
          onCancel={() => setCapturingForList(null)}
          onSubmit={(typed, overrides, tookMs) =>
            viewModel.capture(typed, overrides, tookMs)
          }
        />
      )}
      {editing == null ? null : (
        <QuickCaptureSheet
          copy={copy}
          editing={{
            title: editing.title,
            priority: editing.priority,
            dueAtMs: editing.dueAtMs,
            listId: editing.listId,
          }}
          language={language}
          lists={viewModel.lists}
          nowMs={viewModel.nowMs}
          onCancel={() => setEditing(null)}
          onSubmit={(typed, overrides) => {
            viewModel.edit(editing.id, { title: typed, ...overrides });
            setEditing(null);
          }}
        />
      )}
      {deleting == null ? null : (
        <ConfirmDialog
          cancelLabel={copy.today.removeCancel}
          confirmLabel={copy.today.remove}
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            viewModel.remove(deleting.id);
            setDeleting(null);
          }}
          testID="task-confirm"
          title={copy.today.removeConfirm(deleting.title)}
        />
      )}
      {deletingList == null ? null : (
        <ConfirmDialog
          body={
            deletingList.share != null
              ? copy.lists.deleteSharedDetail
              : copy.lists.deleteDetail
          }
          cancelLabel={copy.today.removeCancel}
          confirmLabel={copy.lists.delete}
          destructive
          onCancel={() => setDeletingList(null)}
          onConfirm={() => {
            if (deletingList.share != null)
              viewModel.stopSharingList(deletingList.id);
            viewModel.deleteList(deletingList.id);
            setDeletingList(null);
            setOpenListId(current =>
              current === deletingList.id ? null : current,
            );
          }}
          testID="list-confirm"
          title={copy.lists.deleteConfirm(deletingList.name)}
        />
      )}
      {leavingList == null ? null : (
        <ConfirmDialog
          cancelLabel={copy.today.removeCancel}
          confirmLabel={copy.lists.leaveProject}
          destructive
          onCancel={() => setLeavingList(null)}
          onConfirm={() => {
            viewModel.leaveList(leavingList.id);
            setLeavingList(null);
            setOpenListId(current =>
              current === leavingList.id ? null : current,
            );
          }}
          testID="leave-confirm"
          title={copy.lists.leaveProjectConfirm(leavingList.name)}
        />
      )}
      {sharingList == null ? null : (
        <ShareSheet
          copy={copy}
          errorKind={viewModel.shareErrorKind}
          list={
            viewModel.lists.find(list => list.id === sharingList.id) ??
            sharingList
          }
          onCancel={() => setSharingList(null)}
          onChangeInvitedAs={role =>
            viewModel.changeInvitedAs(sharingList.id, role)
          }
          onCopyLink={token => viewModel.copyShareLink(token)}
          onCreateLink={role => {
            viewModel.createShareLink(sharingList.id, role);
            // The project becomes shared right here, so it opens behind the
            // sheet: closing the sheet lands on the day band, not on a
            // collapsed card hiding it.
            setOpenListId(sharingList.id);
          }}
          onInvite={token =>
            viewModel.inviteToShareLink(token, copy.lists.shareHint)
          }
          onRemoveMember={memberId =>
            viewModel.removeShareMember(sharingList.id, memberId)
          }
          onStopSharing={() => viewModel.stopSharingList(sharingList.id)}
          personId={personId ?? ''}
          status={viewModel.shareStatus}
        />
      )}
      {!joiningInvite ? null : (
        <JoinInviteSheet
          copy={copy}
          errorKind={viewModel.joinErrorKind}
          onCancel={() => {
            setJoiningInvite(false);
            viewModel.dismissJoinError();
          }}
          onDismissError={viewModel.dismissJoinError}
          onJoin={input => {
            viewModel.joinSharedList(input).then(ok => {
              if (ok) setJoiningInvite(false);
            });
          }}
          onPasteFromClipboard={viewModel.pasteFromClipboard}
          status={viewModel.joinStatus}
        />
      )}
    </Screen>
  );
}

// Enough room for the floating action and the tab bar under it: the last
// thing on the list — the invite call in a group's empty state — has to end
// above both, the same clearance the tasks screen already keeps.
const styles = StyleSheet.create({ scroll: { paddingBottom: 168 } });

const Screen = styled.View`
  flex: 1;
`;

const Content = styled.ScrollView`
  flex: 1;
  padding: 0px ${({ theme }) => theme.spacing.large}px;
`;
const ListBlock = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.small + 1}px;
`;
const ListHeader = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.card};
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: ${({ theme }) => theme.radii.large}px;
  padding: ${({ theme }) => theme.spacing.medium}px;
  elevation: 2;
  shadow-color: #1b1710;
  shadow-opacity: ${({ theme }) => (theme.mode === 'dark' ? 0 : 0.07)};
  shadow-radius: 14px;
  shadow-offset: 0px 5px;
`;
const Row = styled(PressableScale)`
  flex: 1;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.small + 3}px;
`;
const MoreButton = styled(PressableScale)`
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  margin-left: ${({ theme }) => theme.spacing.small}px;
`;
const ProjectBadge = styled.View<{ $tone: string }>`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.small}px;
  align-items: center;
  justify-content: center;
  background-color: ${({ $tone }) => `${$tone}1F`};
`;
const Name = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.heading - 2}px;
  font-weight: 700;
  letter-spacing: -0.3px;
`;
const Count = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
`;
const Track = styled.View`
  width: 100%;
  height: 4px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
  overflow: hidden;
`;
const Fill = styled.View`
  height: 100%;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.accent};
`;
const ListActions = styled(Animated.View)`
  flex-direction: row;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.small}px;
  padding: ${({ theme }) => theme.spacing.small}px
    ${({ theme }) => theme.spacing.small}px 0px;
`;
const ActionButton = styled(PressableScale)<{ $danger?: boolean }>`
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radii.small}px;
  background-color: ${({ theme, $danger }) =>
    $danger ? theme.colors.cardElevated : theme.colors.card};
`;
const ActionText = styled.Text<{ $danger?: boolean }>`
  color: ${({ theme, $danger }) =>
    $danger ? theme.colors.danger : theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
`;
const Expanded = styled(Animated.View)`
  padding-left: ${({ theme }) => theme.spacing.small}px;
`;
const EmptyText = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  padding: ${({ theme }) => theme.spacing.medium}px 0px;
`;
const AddTaskButton = styled(PressableScale)`
  flex-direction: row;
  align-self: flex-start;
  align-items: center;
  gap: 7px;
  padding: 11px 10px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
  margin-bottom: ${({ theme }) => theme.spacing.small}px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
`;
const AddTaskText = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;
const JoinButton = styled(PressableScale)`
  flex-direction: row;
  align-self: flex-start;
  align-items: center;
  gap: 7px;
  min-height: 48px;
  padding: 0px 4px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;
const JoinButtonText = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;
const GroupEmpty = styled.View`
  padding: ${({ theme }) => theme.spacing.medium}px 0px;
`;
const InviteHighlight = styled(PressableScale)`
  flex-direction: row;
  align-self: flex-start;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  min-height: 48px;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
`;
const InviteHighlightText = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;
const AllDoneBanner = styled.View`
  padding: ${({ theme }) => theme.spacing.small + 4}px 0px;
`;
const AllDoneText = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
`;
