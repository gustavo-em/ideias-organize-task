import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import {
  disclosureEnter,
  fadeEnter,
  rowEnter,
} from '../../../../app/animation/motion';
import { markSheetPress, useRenderCount } from '../../../../app/perf/sheetPerf';
import { isCompleted, isOpen, type Task } from '../../domain/Task';
import { dayKeyOf, type SharedMemberDay } from '../../domain/SharedMemberDay';
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

/** Shared, frozen fallbacks: a new `[]` on every render is a new prop, and a
 * new prop defeats the memo that keeps the projects still. */
const EMPTY_TASKS: readonly Task[] = [];
const EMPTY_DAY_RECORDS: readonly SharedMemberDay[] = [];
const EMPTY_DAY_ENTRIES: ReturnType<typeof sharedDay> = [];

function memberFor(list: TaskList, id: string | null): ListMember | null {
  if (id == null || list.share == null) return null;
  return list.share.members.find(member => member.personId === id) ?? null;
}

/** A group streak only counts while it is today's. */
function streakDaysOf(
  streak: { days: number; lastDayKey: string | null } | undefined,
  nowMs: number,
): number {
  const current = streak ?? EMPTY_GROUP_STREAK;

  return current.lastDayKey === dayKeyOf(nowMs) ? current.days : 0;
}

/** Lists hold the next steps of something bigger, opening in place for comparison. */
export function ListsScreen({ copy, language, viewModel }: ListsScreenProps) {
  const theme = useTheme();
  useRenderCount('ListsScreen');
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

  // Grouping the tasks once beats filtering the whole set again for every
  // project on every render of the screen.
  const tasksByList = useMemo(() => {
    const grouped = new Map<string, Task[]>();

    for (const task of viewModel.tasks) {
      const bucket = grouped.get(task.listId ?? '');
      if (bucket == null) grouped.set(task.listId ?? '', [task]);
      else bucket.push(task);
    }

    return grouped;
  }, [viewModel.tasks]);

  const toggleOpen = useCallback((listId: string) => {
    setOpenListId(current => (current === listId ? null : listId));
    setActionsForListId(null);
  }, []);
  const toggleActions = useCallback((listId: string) => {
    setActionsForListId(current => (current === listId ? null : listId));
  }, []);
  const openShare = useCallback((list: TaskList) => {
    markSheetPress('ShareSheet');
    setSharingList(list);
    setActionsForListId(null);
  }, []);
  const openRename = useCallback((list: TaskList) => {
    setRenamingList(list);
    setActionsForListId(null);
  }, []);
  const openLeave = useCallback((list: TaskList) => {
    setLeavingList(list);
    setActionsForListId(null);
  }, []);
  const openDeleteList = useCallback((list: TaskList) => {
    setDeletingList(list);
    setActionsForListId(null);
  }, []);
  const openCapture = useCallback((list: TaskList) => {
    markSheetPress('QuickCaptureSheet');
    setCapturingForList(list);
  }, []);
  const editTask = useCallback((task: Task) => {
    markSheetPress('QuickCaptureSheet');
    setEditing(task);
  }, []);
  const deleteTask = useCallback((task: Task) => setDeleting(task), []);
  const toggleTask = useCallback(
    (taskId: string) => viewModel.toggle(taskId),
    [viewModel],
  );
  const moveIntoDay = useCallback(
    (taskId: string) => viewModel.moveIntoDay(taskId),
    [viewModel],
  );

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
          onPress={() => {
            markSheetPress('JoinInviteSheet');
            setJoiningInvite(true);
          }}
          testID="join-invite"
        >
          <LinkGlyph color={theme.colors.accentInk} size={14} />
          <JoinButtonText>{copy.lists.joinInvite}</JoinButtonText>
        </JoinButton>

        {viewModel.lists.map((list, index) => (
          <ProjectBlock
            copy={copy}
            dayRecords={viewModel.sharedDays[list.id] ?? EMPTY_DAY_RECORDS}
            index={index}
            key={list.id}
            list={list}
            nowMs={viewModel.nowMs}
            offline={viewModel.sharedDayOffline[list.id] === true}
            onCapture={openCapture}
            onDeleteList={openDeleteList}
            onDeleteTask={deleteTask}
            onEditTask={editTask}
            onLeaveList={openLeave}
            onMoveIntoDay={moveIntoDay}
            onRenameList={openRename}
            onShare={openShare}
            onToggleActions={toggleActions}
            onToggleOpen={toggleOpen}
            onToggleTask={toggleTask}
            open={openListId === list.id}
            personId={personId}
            showingActions={actionsForListId === list.id}
            streakDays={streakDaysOf(
              viewModel.groupStreaks[list.id],
              viewModel.nowMs,
            )}
            tasks={tasksByList.get(list.id) ?? EMPTY_TASKS}
          />
        ))}
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
          identity={viewModel.identity}
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

interface ProjectTaskProps {
  copy: TaskCopy;
  index: number;
  isViewer: boolean;
  list: TaskList;
  nowMs: number;
  personId: string | null;
  task: Task;
  onDeleteTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onMoveIntoDay: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
}

/**
 * One task card inside a project.
 *
 * The card is wrapped so its props hold still: the action object and the three
 * handlers used to be rebuilt on every render of the project, which meant a
 * project opening a menu re-rendered every card under it.
 */
const ProjectTask = memo(function ProjectTaskView({
  copy,
  index,
  isViewer,
  list,
  nowMs,
  personId,
  task,
  onDeleteTask,
  onEditTask,
  onMoveIntoDay,
  onToggleTask,
}: ProjectTaskProps) {
  const handleDelete = useCallback(
    () => onDeleteTask(task),
    [onDeleteTask, task],
  );
  const handleEdit = useCallback(() => onEditTask(task), [onEditTask, task]);
  const handleToggle = useCallback(
    () => onToggleTask(task.id),
    [onToggleTask, task.id],
  );
  const action = useMemo(
    () =>
      !isViewer && isOpen(task)
        ? {
            label: copy.lists.addToDay,
            onPress: () => onMoveIntoDay(task.id),
          }
        : undefined,
    [copy.lists.addToDay, isViewer, onMoveIntoDay, task],
  );

  return (
    <TaskCard
      action={action}
      completedByMember={
        isCompleted(task) && task.completedBy !== personId
          ? memberFor(list, task.completedBy ?? null)
          : null
      }
      copy={copy}
      disabled={isViewer}
      index={index}
      listColor={null}
      listIcon={null}
      listName={null}
      nowMs={nowMs}
      onDelete={isViewer ? undefined : handleDelete}
      onEdit={isViewer ? undefined : handleEdit}
      onToggle={handleToggle}
      task={task}
    />
  );
});

interface ProjectBlockProps {
  copy: TaskCopy;
  dayRecords: readonly SharedMemberDay[];
  index: number;
  list: TaskList;
  nowMs: number;
  offline: boolean;
  open: boolean;
  personId: string | null;
  showingActions: boolean;
  streakDays: number;
  tasks: readonly Task[];
  onCapture: (list: TaskList) => void;
  onDeleteList: (list: TaskList) => void;
  onDeleteTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onLeaveList: (list: TaskList) => void;
  onMoveIntoDay: (taskId: string) => void;
  onRenameList: (list: TaskList) => void;
  onShare: (list: TaskList) => void;
  onToggleActions: (listId: string) => void;
  onToggleOpen: (listId: string) => void;
  onToggleTask: (taskId: string) => void;
}

/**
 * One project on the screen.
 *
 * It is its own component so that opening a sheet — which only changes state
 * that lives on the screen — does not re-render every project and every task
 * card in the same frame the sheet is trying to animate in.
 */
const ProjectBlock = memo(function ProjectBlockView({
  copy,
  dayRecords,
  index,
  list,
  nowMs,
  offline,
  open,
  personId,
  showingActions,
  streakDays,
  tasks,
  onCapture,
  onDeleteList,
  onDeleteTask,
  onEditTask,
  onLeaveList,
  onMoveIntoDay,
  onRenameList,
  onShare,
  onToggleActions,
  onToggleOpen,
  onToggleTask,
}: ProjectBlockProps) {
  const theme = useTheme();
  useRenderCount('ProjectBlock');

  const done = tasks.filter(isCompleted).length;
  const shared = list.share != null;
  const role = shared
    ? list.share!.members.find(member => member.personId === personId)?.role ??
      null
    : null;
  const isViewer = shared && !canEdit(list, personId ?? '');
  const canManageAppearance =
    list.id !== INBOX_LIST_ID && canEdit(list, personId ?? '');
  const canDeleteList = shared ? role === 'owner' : list.id !== INBOX_LIST_ID;
  const canLeave = shared && role !== 'owner';
  const canManage =
    list.id !== INBOX_LIST_ID &&
    (canShare(list) || canManageAppearance || canDeleteList || canLeave);
  // The band only ever describes today, and only for a project that is
  // actually shared.
  const dayEntries = useMemo(
    () =>
      list.share == null
        ? EMPTY_DAY_ENTRIES
        : sharedDay(list.share.members, dayRecords, tasks, nowMs),
    [dayRecords, list.share, nowMs, tasks],
  );
  const tookSomethingToday = dayEntries.some(
    entry => entry.member.personId === personId && entry.state !== 'absent',
  );

  const handleToggleOpen = useCallback(
    () => onToggleOpen(list.id),
    [list.id, onToggleOpen],
  );
  const handleToggleActions = useCallback(
    () => onToggleActions(list.id),
    [list.id, onToggleActions],
  );
  const handleShare = useCallback(() => onShare(list), [list, onShare]);
  const handleRename = useCallback(
    () => onRenameList(list),
    [list, onRenameList],
  );
  const handleLeave = useCallback(() => onLeaveList(list), [list, onLeaveList]);
  const handleDeleteList = useCallback(
    () => onDeleteList(list),
    [list, onDeleteList],
  );
  const handleCapture = useCallback(() => onCapture(list), [list, onCapture]);

  return (
    <ListBlock entering={rowEnter(index)}>
      <ListHeader>
        <Row
          accessibilityLabel={
            isViewer ? `${list.name}, ${copy.lists.viewerCannotAdd}` : list.name
          }
          accessibilityState={{ selected: open }}
          onPress={handleToggleOpen}
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
          {/* Names the state the screen is already in: without it, a viewer
              taps a disabled checkbox and gets silence. */}
          {isViewer ? <ReadOnlyTag>{copy.lists.roleViewer}</ReadOnlyTag> : null}
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
            onPress={handleToggleActions}
            testID={`list-actions-${list.id}`}
          >
            <MoreGlyph color="#756b56" />
          </MoreButton>
        ) : null}
      </ListHeader>

      {showingActions ? (
        <ListActions entering={disclosureEnter()} testID="list-actions-open">
          {canShare(list) ? (
            <ActionButton
              accessibilityLabel={copy.lists.share}
              onPress={handleShare}
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
              onPress={handleRename}
            >
              <ActionText>{copy.lists.rename}</ActionText>
            </ActionButton>
          ) : null}
          {canLeave ? (
            // Sair de um projeto não é a ação destrutiva: o vermelho fica com
            // Excluir, e sair lê no mesmo tom de Compartilhar e Renomear.
            <ActionButton
              accessibilityLabel={copy.lists.leaveProject}
              onPress={handleLeave}
            >
              <ActionText>{copy.lists.leaveProject}</ActionText>
            </ActionButton>
          ) : null}
          {canDeleteList ? (
            <ActionButton
              $danger
              accessibilityLabel={copy.lists.delete}
              onPress={handleDeleteList}
            >
              <ActionText $danger>{copy.lists.delete}</ActionText>
            </ActionButton>
          ) : null}
        </ListActions>
      ) : null}

      {open ? (
        <Expanded entering={fadeEnter()}>
          {shared ? (
            <SharedDayBand
              allDone={isGroupDayClosed(list.share!.members, dayEntries)}
              copy={copy}
              entries={dayEntries}
              offline={offline}
              onTakeOne={
                isViewer || tookSomethingToday ? undefined : handleCapture
              }
              streakDays={streakDays}
            />
          ) : null}

          {tasks.length === 0 ? (
            shared ? (
              <GroupEmpty>
                <EmptyText>{copy.lists.groupEmpty}</EmptyText>
                {list.share!.members.length <= 1 ? (
                  <InviteHighlight
                    accessibilityLabel={copy.lists.share}
                    onPress={handleShare}
                  >
                    <PeopleGlyph color={theme.colors.accentInk} size={16} />
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

          {tasks.map((task, taskIndex) => (
            <ProjectTask
              copy={copy}
              index={taskIndex}
              isViewer={isViewer}
              key={task.id}
              list={list}
              nowMs={nowMs}
              onDeleteTask={onDeleteTask}
              onEditTask={onEditTask}
              onMoveIntoDay={onMoveIntoDay}
              onToggleTask={onToggleTask}
              personId={personId}
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
              onPress={handleCapture}
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
});

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
/* Same neutral metadata voice as the count beside it: it states the role, it
   does not warn. */
const ReadOnlyTag = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
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
