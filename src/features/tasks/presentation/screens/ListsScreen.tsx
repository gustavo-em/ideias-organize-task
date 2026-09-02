import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, RefreshControl, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import {
  DISCLOSURE,
  disclosureEnter,
  fadeEnter,
  rowEnter,
} from '../../../../app/animation/motion';
import { markSheetPress, useRenderCount } from '../../../../app/perf/sheetPerf';
import { endOfDay, isSameDay } from '../../domain/Day';
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
  type SharedDayStatus,
} from '../models/sharedDay';
import type { TasksViewModel } from '../view-models/useTasksViewModel';
import { ConfirmDialog } from '../views/ConfirmDialog';
import {
  ChevronGlyph,
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
import { templateAppearance } from '../models/projectTemplates';
import { PressableScale } from '../views/PressableScale';
import { ProjectEmptyState } from '../views/ProjectEmptyState';
import { QuickCaptureSheet } from '../views/QuickCaptureSheet';
import { ScreenHeader } from '../views/ScreenHeader';
import { SharedDayBand } from '../views/SharedDayBand';
import { ShareSheet } from '../views/ShareSheet';
import { TaskCard } from '../views/TaskCard';

interface ListsScreenProps {
  /** Somebody asked for an invite on the walk-through and has just signed in:
   * the space is opened here with its link already being made, so the first
   * screen after the account is the invite itself. */
  autoInvite?: boolean;
  onAutoInviteDone?: () => void;
  copy: TaskCopy;
  language: AppLanguage;
  /** The signed-in account's own profile as this device knows it, reservation
   * or not: their own row never waits on the network to show the name and
   * handle they chose. */
  ownProfile: { displayName: string; handle: string | null } | null;
  /** The one-time ask for the notification permission, shown only when there
   * is a shared project on screen — never on a cold start. */
  notificationPrompt: {
    visible: boolean;
    onEnable: () => Promise<boolean>;
    onDismiss: () => void;
  };
  viewModel: TasksViewModel;
}

/** Shared, frozen fallbacks: a new `[]` on every render is a new prop, and a
 * new prop defeats the memo that keeps the projects still. */
const EMPTY_TASKS: readonly Task[] = [];
const EMPTY_DAY_RECORDS: readonly SharedMemberDay[] = [];
const EMPTY_DAY_TASK_IDS: readonly string[] = [];
const EMPTY_ASSIGNEES: readonly ListMember[] = [];
const EMPTY_ASSIGNED_IDS: readonly string[] = [];
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
export function ListsScreen({
  autoInvite = false,
  onAutoInviteDone,
  copy,
  language,
  notificationPrompt,
  ownProfile,
  viewModel,
}: ListsScreenProps) {
  const theme = useTheme();
  useRenderCount('ListsScreen');
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [creatingList, setCreatingList] = useState(false);
  // Whether the project being created is meant for other people. Decided in
  // the sheet, answered right after saving by the invite itself.
  const [createShared, setCreateShared] = useState(false);
  // Only set when the invite from the walk-through could not name a space by
  // itself: the editor opens on that name, not on the template list.
  const [inviteFallbackName, setInviteFallbackName] = useState<string | null>(
    null,
  );
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
  // Answered on this screen, so the line leaves the moment it is used and does
  // not wait for the setting to come back from storage.
  const [promptAnswered, setPromptAnswered] = useState(false);

  const personId = viewModel.identity?.personId ?? null;
  const autoInviteRan = useRef(false);

  // The invite asked for before the account, made the moment there is one: a
  // space named after the Casa template, already shared, with the sheet open on
  // its link. The suggested name may already be taken — the space gets a
  // numbered one instead of sending anybody back to pick a template, and the
  // name is theirs to change from the card afterwards.
  useEffect(() => {
    // The guard is only about the run in progress: the screen stays mounted for
    // the whole session, so asking again from the replayed walk-through has to
    // be answered again.
    if (!autoInvite) {
      autoInviteRan.current = false;
      return;
    }

    if (autoInviteRan.current) return;
    if (!viewModel.isRestored || personId == null) return;

    autoInviteRan.current = true;
    const suggested = copy.lists.templates.home.name;
    const taken = new Set(
      viewModel.lists.map(list => normalizeListName(list.name)),
    );
    let name = suggested;

    for (
      let attempt = 2;
      taken.has(normalizeListName(name)) && attempt < 100;
      attempt += 1
    ) {
      name = `${suggested} ${attempt}`;
    }

    const created = viewModel.createList(name, templateAppearance('home'));

    if (created == null) {
      // Nothing left to guess: the editor opens on the suggested name with the
      // share option already on, one tap from the same invite.
      setInviteFallbackName(name);
      setCreateShared(true);
      setCreatingList(true);
      onAutoInviteDone?.();
      return;
    }

    setOpenListId(created.id);
    markSheetPress('ShareSheet');
    setSharingList(created);
    viewModel.createShareLink(created.id, 'editor');
    onAutoInviteDone?.();
  }, [
    autoInvite,
    copy.lists.templates.home.name,
    onAutoInviteDone,
    personId,
    viewModel,
  ]);

  useEffect(() => {
    viewModel.refreshAllSharedLists();
    // Only on the tab's first paint — the RefreshControl below covers every
    // pull after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coming back to the app is a sync: whatever the others did while it was in
  // the background is read here, and that read is what feeds the tray.
  const refreshAll = viewModel.refreshAllSharedLists;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshAll();
    });

    return () => subscription.remove();
  }, [refreshAll]);

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

  // Nothing to notify about without a project shared with somebody, so that is
  // also the only moment the permission is worth asking for.
  const showNotificationPrompt =
    notificationPrompt.visible &&
    !promptAnswered &&
    viewModel.lists.some(list => list.share != null);

  // Asking the same project again, from the band that failed to read it.
  const retryDay = useCallback(
    (listId: string) => viewModel.refreshSharedList(listId),
    [viewModel],
  );

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
  // What the sheet shows comes from the workspace, not from the snapshot that
  // opened it: a step added inside the sheet has to appear in it.
  const editingTask =
    editing == null
      ? null
      : viewModel.tasks.find(task => task.id === editing.id) ?? editing;
  const toggleTask = useCallback(
    (taskId: string) => viewModel.toggle(taskId),
    [viewModel],
  );
  // Who took the task being edited, when that task lives in a shared project.
  // Anywhere else the sheet gets nothing and stays the sheet it always was.
  const editingList =
    editingTask == null ? null : viewModel.listOf(editingTask.listId);
  const editingShare = editingList?.share ?? null;
  const identityId = viewModel.identity?.personId ?? null;
  const editingAssignment = useMemo(() => {
    if (editingTask == null || editingShare == null || identityId == null) {
      return undefined;
    }

    return {
      members: editingShare.members,
      assignedIds: editingTask.assignedIds ?? EMPTY_ASSIGNED_IDS,
      personId: identityId,
      isOwner:
        editingShare.members.find(member => member.personId === identityId)
          ?.role === 'owner',
      onToggle: (targetId: string) =>
        viewModel.toggleTaskAssignee(
          editingTask.listId,
          editingTask.id,
          targetId,
        ),
    };
  }, [editingShare, editingTask, identityId, viewModel]);
  // Taking a task into the day is two things at once, and only one of them was
  // happening: it joins the day's chosen few, and it becomes due today. Without
  // the date the task went on sitting under "sem prazo" on the other tab, which
  // read as the button doing nothing at all.
  const moveIntoDay = useCallback(
    (taskId: string) => {
      const nowMs = viewModel.nowMs;
      // The day can refuse: a full day, or one already closed, keeps the task
      // where it is, and then nothing else should change either. A task the day
      // already holds is not a refusal — it produces no event, and its date
      // still has to say today, or the card reads "No dia" next to "amanhã".
      const wasAlreadyInDay = (
        viewModel.dayTaskIds ?? EMPTY_DAY_TASK_IDS
      ).includes(taskId);
      const committed = viewModel.moveIntoDay(taskId);

      if (!committed && !wasAlreadyInDay) return;

      const task = viewModel.tasks.find(candidate => candidate.id === taskId);

      if (
        task != null &&
        (task.dueAtMs == null || !isSameDay(task.dueAtMs, nowMs))
      )
        viewModel.edit(taskId, { dueAtMs: endOfDay(nowMs) });
    },
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
          count={viewModel.lists.length}
          eyebrow={copy.tabs.lists}
          subtitle={copy.lists.subtitle(
            viewModel.lists.length,
            viewModel.openTaskCount,
          )}
          testID="lists-header"
          title={copy.lists.title}
        />

        {showNotificationPrompt ? (
          <PermissionRow entering={fadeEnter()} testID="activity-permission">
            <PermissionText>{copy.projectActivity.promptBody}</PermissionText>
            <PermissionActions>
              <PermissionAction
                accessibilityLabel={copy.projectActivity.promptEnable}
                accessibilityRole="button"
                onPress={() => {
                  setPromptAnswered(true);
                  notificationPrompt.onEnable().catch(() => undefined);
                }}
                testID="activity-permission-enable"
              >
                <PermissionActionLabel $primary>
                  {copy.projectActivity.promptEnable}
                </PermissionActionLabel>
              </PermissionAction>
              <PermissionAction
                accessibilityLabel={copy.projectActivity.promptDismiss}
                accessibilityRole="button"
                onPress={() => {
                  setPromptAnswered(true);
                  notificationPrompt.onDismiss();
                }}
                testID="activity-permission-dismiss"
              >
                <PermissionActionLabel>
                  {copy.projectActivity.promptDismiss}
                </PermissionActionLabel>
              </PermissionAction>
            </PermissionActions>
          </PermissionRow>
        ) : null}

        {viewModel.lists.map((list, index) => (
          <ProjectBlock
            copy={copy}
            dayRecords={viewModel.sharedDays[list.id] ?? EMPTY_DAY_RECORDS}
            dayTaskIds={viewModel.dayTaskIds ?? EMPTY_DAY_TASK_IDS}
            index={index}
            key={list.id}
            list={list}
            nowMs={viewModel.nowMs}
            onCapture={openCapture}
            onDeleteList={openDeleteList}
            onDeleteTask={deleteTask}
            onEditTask={editTask}
            onLeaveList={openLeave}
            onMoveIntoDay={moveIntoDay}
            onRenameList={openRename}
            onRetryDay={retryDay}
            onShare={openShare}
            onToggleActions={toggleActions}
            onToggleOpen={toggleOpen}
            onToggleTask={toggleTask}
            open={openListId === list.id}
            personId={personId}
            showingActions={actionsForListId === list.id}
            status={viewModel.sharedDayStatus[list.id] ?? 'ok'}
            streakDays={streakDaysOf(
              viewModel.groupStreaks[list.id],
              viewModel.nowMs,
            )}
            tasks={tasksByList.get(list.id) ?? EMPTY_TASKS}
          />
        ))}
      </Content>

      {/* Whoever arrives holding a link is not looking for "new project":
          the way in stays on screen, in reach, just above the primary action
          and never scrolling away with the list. Its place does not move when
          the floating action steps aside, so the target holds still. */}
      <JoinDock pointerEvents="box-none">
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
      </JoinDock>

      {/* The primary action never leaves the screen — hiding it while a
          project is open made it look like creating had moved somewhere else.
          Only a sheet on top takes its place. */}
      {creatingList || renamingList != null ? null : (
        <FloatingAction
          label={copy.lists.newList}
          onPress={() => {
            setCreateShared(false);
            setCreatingList(true);
          }}
          testID="new-list"
        />
      )}

      {creatingList ? (
        <ProjectEditorSheet
          copy={copy}
          /* Coming from the walk-through the name is already suggested, so the
             sheet opens on it instead of on the template list. */
          initialAppearance={
            inviteFallbackName == null ? undefined : templateAppearance('home')
          }
          initialName={inviteFallbackName ?? undefined}
          onCancel={() => {
            setCreatingList(false);
            setCreateShared(false);
            setInviteFallbackName(null);
          }}
          onSubmit={(name, appearance) => {
            const created = viewModel.createList(name, appearance);
            if (created != null) setOpenListId(created.id);
            // The project exists locally before anything is asked of the
            // network, so a refused link never costs the typed name: the
            // sheet takes over from here with the invite, or with the error
            // and the button to try again.
            if (created != null && createShared) {
              markSheetPress('ShareSheet');
              setSharingList(created);
              viewModel.createShareLink(created.id, 'editor');
            }
            // A refused name keeps the sheet open, and the choice in it.
            if (created != null) setCreateShared(false);
            if (created != null) setInviteFallbackName(null);
            return created != null;
          }}
          shareOption={{ value: createShared, onChange: setCreateShared }}
          submitLabel={copy.lists.create}
          templates={inviteFallbackName == null}
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
          submitLabel={copy.capture.save}
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
      {editing == null || editingTask == null ? null : (
        <QuickCaptureSheet
          assignment={editingAssignment}
          copy={copy}
          editing={{
            id: editingTask.id,
            title: editingTask.title,
            priority: editingTask.priority,
            dueAtMs: editingTask.dueAtMs,
            listId: editingTask.listId,
            subtasks: editingTask.subtasks,
          }}
          language={language}
          lists={viewModel.lists}
          nowMs={viewModel.nowMs}
          onAddSubtask={title =>
            viewModel.addTaskSubtask(editingTask.id, title)
          }
          onCancel={() => setEditing(null)}
          onDeleteSubtask={subtaskId =>
            viewModel.deleteTaskSubtask(editingTask.id, subtaskId)
          }
          onRenameSubtask={(subtaskId, title) =>
            viewModel.renameTaskSubtask(editingTask.id, subtaskId, title)
          }
          onToggleSubtask={subtaskId =>
            viewModel.toggleTaskSubtask(editingTask.id, subtaskId)
          }
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
          language={language}
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
          identity={
            viewModel.identity == null
              ? null
              : {
                  personId: viewModel.identity.personId,
                  name: ownProfile?.displayName ?? viewModel.identity.name,
                  handle: ownProfile?.handle ?? viewModel.identity.handle,
                }
          }
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
  /** Whether the day itself holds this task — membership, not a date. */
  isInDay: boolean;
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
  isInDay,
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
  // The slot answers instead of asking only when both halves are true: the day
  // holds the task and the task is due today. A task the day picked up while
  // still due tomorrow would otherwise read "No dia" beside "amanhã", so the
  // offer stands and taking it sets the date.
  const isSettledForToday =
    isInDay && task.dueAtMs != null && isSameDay(task.dueAtMs, nowMs);
  const action = useMemo(
    () =>
      !isViewer && isOpen(task)
        ? isSettledForToday
          ? {
              label: copy.lists.inDay,
              disabled: true,
              onPress: () => undefined,
            }
          : {
              label: copy.lists.addToDay,
              onPress: () => onMoveIntoDay(task.id),
            }
        : undefined,
    [
      copy.lists.addToDay,
      copy.lists.inDay,
      isSettledForToday,
      isViewer,
      onMoveIntoDay,
      task,
    ],
  );

  // The people who took it, in the project's own order, so the stack never
  // reshuffles between two renders.
  const assignees = useMemo(
    () =>
      list.share == null
        ? EMPTY_ASSIGNEES
        : list.share.members.filter(member =>
            (task.assignedIds ?? []).includes(member.personId),
          ),
    [list.share, task.assignedIds],
  );

  return (
    <TaskCard
      action={action}
      assignees={assignees}
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
  /** The ids the day holds right now, so a card can tell being in the day from
   * merely carrying today's date. */
  dayTaskIds: readonly string[];
  index: number;
  list: TaskList;
  nowMs: number;
  status: SharedDayStatus;
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
  onRetryDay: (listId: string) => Promise<unknown>;
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
  dayTaskIds,
  index,
  list,
  nowMs,
  status,
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
  onRetryDay,
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
  const handleRetryDay = useCallback(
    () => onRetryDay(list.id),
    [list.id, onRetryDay],
  );

  // The chevron turns over as the project opens. `DISCLOSURE` carries
  // `ReduceMotion.System`, so a phone asking for less movement gets the final
  // angle straight away and the arrow still says which way it points.
  const chevronSpin = useSharedValue(open ? 180 : 0);

  useEffect(() => {
    chevronSpin.value = withTiming(open ? 180 : 0, DISCLOSURE);
  }, [chevronSpin, open]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronSpin.value}deg` }],
  }));

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
          {isViewer ? (
            <ReadOnlyTag>{copy.lists.readOnlyTag}</ReadOnlyTag>
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
        {/* Sharing a project is the one action people come looking for, so it
            stops hiding behind the three dots. The menu keeps its entry: this
            is a shortcut, not a move. */}
        {canShare(list) ? (
          <ShareButton
            accessibilityLabel={copy.lists.share}
            accessibilityRole="button"
            hitSlop={5}
            onPress={handleShare}
            testID="list-share-inline"
          >
            <PeopleGlyph color={theme.colors.mutedStrong} size={18} />
          </ShareButton>
        ) : null}
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
        {/* Until now nothing on the card said it opened. The chevron sits
            where a disclosure belongs — last on the row — and carries the
            state out loud for a screen reader. */}
        <ChevronButton
          accessibilityLabel={
            open
              ? copy.lists.collapseProject(list.name)
              : copy.lists.expandProject(list.name)
          }
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={handleToggleOpen}
          testID={`list-chevron-${list.id}`}
        >
          <ChevronSpin style={chevronStyle}>
            <ChevronGlyph color={theme.colors.muted} size={18} />
          </ChevronSpin>
        </ChevronButton>
      </ListHeader>

      {showingActions ? (
        <ListActions entering={disclosureEnter()} testID="list-actions-open">
          {/* Floating in the gap, the row belonged to no project in
              particular. Naming the project ties the actions back to the card
              that opened them. */}
          <ActionsOwner numberOfLines={1}>
            {copy.lists.actionsFor(list.name)}
          </ActionsOwner>
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
              onRetry={handleRetryDay}
              onTakeOne={
                isViewer || tookSomethingToday ? undefined : handleCapture
              }
              status={status}
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
              <ProjectEmptyState message={copy.lists.empty} />
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
              isInDay={dayTaskIds.includes(task.id)}
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

/** The floating action's own height, from `FloatingAction`. */
const FLOATING_ACTION_HEIGHT = 54;

/** `theme.spacing.large`, for the one style built outside the theme. */
const SPACING_LARGE = 24;

/** The secondary action's own height, and the gap it keeps from the primary
 * one below it. */
const JOIN_BUTTON_HEIGHT = 48;
const JOIN_BUTTON_GAP = 12;

/** The tab column under the screen: its rows are 48 tall over the padding the
 * bar keeps above them. Without it in the clearance the last block of an open
 * space — the day band and its action — ends under the tabs. */
const TAB_BAR_HEIGHT = 58;

/* The whole clearance lives here, on the scroll's own content, rather than
   inside a project block: the floating action's height, the space it floats in,
   and the tab bar under it. The last line of the list — "Adicionar tarefa"
   inside the last project — clears the yellow button instead of ending under
   it. */
const styles = StyleSheet.create({
  scroll: {
    paddingBottom:
      FLOATING_ACTION_HEIGHT +
      JOIN_BUTTON_HEIGHT +
      JOIN_BUTTON_GAP +
      TAB_BAR_HEIGHT +
      SPACING_LARGE * 2,
  },
});

const Screen = styled.View`
  flex: 1;
`;

const Content = styled.ScrollView`
  flex: 1;
  padding: 0px ${({ theme }) => theme.spacing.large}px;
`;
/* A line of type, not a box: the ask sits in the flow of the screen, with a
   thin rule under it and no card of its own. */
const PermissionRow = styled(Animated.View)`
  padding-bottom: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const PermissionText = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  line-height: 18px;
`;

const PermissionActions = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.medium}px;
  margin-top: ${({ theme }) => theme.spacing.tiny}px;
`;

const PermissionAction = styled(PressableScale)`
  min-height: 44px;
  justify-content: center;
`;

const PermissionActionLabel = styled.Text<{ $primary?: boolean }>`
  color: ${({ theme, $primary }) =>
    $primary ? theme.colors.accentInk : theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
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
/* Same box as the three dots beside it, so the two read as one pair of
   controls rather than a button and an afterthought. */
const ShareButton = styled(PressableScale)`
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  margin-left: ${({ theme }) => theme.spacing.tiny}px;
`;
const MoreButton = styled(PressableScale)`
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  margin-left: ${({ theme }) => theme.spacing.small}px;
`;
/* The disclosure gets its 48px as a real box rather than as hit slop: the
   affordance people are meant to find is also the target they are meant to
   hit, and only a real box measures as one. No ground of its own. */
const ChevronButton = styled(PressableScale)`
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  margin-left: ${({ theme }) => theme.spacing.tiny}px;
`;
const ChevronSpin = styled(Animated.View)`
  align-items: center;
  justify-content: center;
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
/* Tight under the card it belongs to, never adrift in the gap before the next
   one. No ground of its own: the card above is the only surface here. */
const ListActions = styled(Animated.View)`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.small}px;
  padding: ${({ theme }) => theme.spacing.tiny}px
    ${({ theme }) => theme.spacing.small}px 0px;
`;
const ActionsOwner = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
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
/* The tasks belong to the project above them, and eight points of indent were
   not saying so. A rule down the left carries the project into its list — the
   same hairline the section headings use, turned on its side — with the indent
   behind it. No fill, no border around them, no second card: continuity is
   drawn, not boxed. */
const Expanded = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.small}px;
  padding-bottom: ${({ theme }) => theme.spacing.small}px;
  margin-left: ${({ theme }) => theme.spacing.medium}px;
  padding-left: ${({ theme }) => theme.spacing.medium}px;
  border-left-width: 1px;
  border-left-color: ${({ theme }) => theme.colors.borderSubtle};
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
/* The secondary half of the pair at the bottom right: same right edge as the
   floating action, one gap above it. Card and border instead of yellow — only
   one action on this screen is the primary one. */
/* The pill has to keep its own width. Left floating on its own, the absolute
   box grew back to the left edge of the screen and the button bled past the
   margin every card respects; the dock takes the positioning and the pill
   only sizes itself, ending flush with the floating action's right edge. */
const JoinDock = styled.View`
  position: absolute;
  right: ${({ theme }) => theme.spacing.large}px;
  bottom: ${SPACING_LARGE + FLOATING_ACTION_HEIGHT + JOIN_BUTTON_GAP}px;
  align-items: flex-end;
`;

const JoinButton = styled(PressableScale)`
  align-self: flex-end;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: ${JOIN_BUTTON_HEIGHT}px;
  padding: 0px 18px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.card};
  elevation: 2;
  shadow-color: #1b1710;
  shadow-opacity: ${({ theme }) => (theme.mode === 'dark' ? 0 : 0.07)};
  shadow-radius: 10px;
  shadow-offset: 0px 4px;
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
