import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Clipboard } from '../../application/ports/Clipboard';
import type { Clock } from '../../application/ports/Clock';
import type { GroupStreakStore } from '../../application/ports/GroupStreakStore';
import type { Haptics } from '../../application/ports/Haptics';
import type { ListStore } from '../../application/ports/ListStore';
import type { ProgressStore } from '../../application/ports/ProgressStore';
import type { ShareGateway } from '../../application/ports/ShareGateway';
import type { TaskStore } from '../../application/ports/TaskStore';
import type { TrioStore } from '../../application/ports/TrioStore';
import type { UsageReporter } from '../../application/ports/UsageReporter';
import {
  captureTask,
  type CaptureOverrides,
} from '../../application/useCases/captureTask';
import { deleteTask } from '../../application/useCases/deleteTask';
import { editTask, type TaskEdit } from '../../application/useCases/editTask';
import {
  createTaskList,
  deleteTaskList,
  renameTaskList,
  type ProjectAppearance,
  wasListCreated,
} from '../../application/useCases/manageTaskList';
import {
  commitTaskToDay,
  planDay,
  reshuffleDay,
} from '../../application/useCases/planDay';
import {
  acceptInvite,
  applyRemoteList,
  leaveSharedList,
  removeMember as removeShareMemberUseCase,
  shareTaskList,
  stopSharing,
} from '../../application/useCases/shareTaskList';
import { toggleTask } from '../../application/useCases/toggleTask';
import {
  getLevelProgress,
  getStreakDays,
  getTrioCount,
  getWeek,
} from '../../domain/Progress';
import { startOfDay } from '../../domain/Day';
import {
  ShareOperationError,
  type ShareErrorKind,
} from '../../domain/ShareError';
import { dayKeyOf, type SharedMemberDay } from '../../domain/SharedMemberDay';
import { isOpen } from '../../domain/Task';
import {
  advanceGroupStreak,
  isGroupDayClosed,
  sanitizeGroupStreak,
  sharedDay,
  EMPTY_GROUP_STREAK,
  type GroupStreak,
} from '../models/sharedDay';
import {
  buildInviteLink,
  findListById,
  parseInviteToken,
  type ListRole,
} from '../../domain/TaskList';
import type { TaskEventBus, UseCaseResult } from '../../domain/TaskEvent';
import {
  backlogCount,
  DEFAULT_DAY_CAPACITY,
  isTrioComplete,
  trioDoneCount,
  trioTasks,
} from '../../domain/Trio';
import {
  EMPTY_WORKSPACE,
  sanitizeWorkspace,
  type Workspace,
} from '../../domain/Workspace';
import { createFeedbackSubscriber } from '../../infrastructure/events/createFeedbackSubscriber';
import { createPersistenceSubscriber } from '../../infrastructure/events/createPersistenceSubscriber';
import { createSharePushSubscriber } from '../../infrastructure/events/createSharePushSubscriber';
import { createUsageSubscriber } from '../../infrastructure/events/createUsageSubscriber';
import { createId } from '../../../../shared/identity/createId';

export interface TasksDependencies {
  bus: TaskEventBus;
  clock: Clock;
  haptics: Haptics;
  listStore: ListStore;
  progressStore: ProgressStore;
  taskStore: TaskStore;
  trioStore: TrioStore;
  usageReporter: UsageReporter;
  shareGateway: ShareGateway;
  groupStreakStore: GroupStreakStore;
  clipboard: Clipboard;
  /** The signed-in account's identity inside a shared project. Null only in
   * the instant between the shell mounting and auth resolving. */
  identity: { personId: string; name: string } | null;
  /** How many tasks the day commits to, from the person's own settings. */
  dayCapacity?: number;
}

/** How often the screen re-reads the clock. Overdue is a fact that changes on
 * its own, and a minute is close enough to catch it without waking the phone. */
const CLOCK_TICK_MS = 60000;

/**
 * Everything the task screens can do, and everything they can see.
 *
 * The view model owns state and effects; the rules live in the use cases it
 * calls, and the reactions live in the subscribers it registers. Nothing here
 * decides what a trio is or what a completion is worth.
 */
/** One member's day replacing the previous one for the same person, so a
 * local publish and a remote pull never show the same person twice. */
function withMemberDay(
  days: readonly SharedMemberDay[],
  day: SharedMemberDay,
): readonly SharedMemberDay[] {
  return [
    ...days.filter(
      candidate =>
        candidate.personId !== day.personId || candidate.dayKey !== day.dayKey,
    ),
    day,
  ];
}

export function useTasksViewModel(dependencies: TasksDependencies) {
  const {
    bus,
    clock,
    haptics,
    listStore,
    progressStore,
    taskStore,
    trioStore,
    usageReporter,
    shareGateway,
    groupStreakStore,
    clipboard,
    identity,
    dayCapacity = DEFAULT_DAY_CAPACITY,
  } = dependencies;

  const [workspace, setWorkspace] = useState<Workspace>(EMPTY_WORKSPACE);
  const [restored, setRestored] = useState<Workspace | null>(null);
  const [nowMs, setNowMs] = useState(() => clock.now());
  const [celebratingStreak, setCelebratingStreak] = useState<number | null>(
    null,
  );
  const [streakPulse, setStreakPulse] = useState(0);
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'error'>(
    'idle',
  );
  const [shareErrorKind, setShareErrorKind] = useState<ShareErrorKind | null>(
    null,
  );
  const [joinStatus, setJoinStatus] = useState<'idle' | 'loading' | 'error'>(
    'idle',
  );
  // What every member published for today, per shared project. A project
  // missing from here has nothing on this device yet — which the band shows
  // as an empty band, never as people who took nothing.
  const [sharedDays, setSharedDays] = useState<
    Record<string, readonly SharedMemberDay[]>
  >({});
  const [sharedDayOffline, setSharedDayOffline] = useState<
    Record<string, boolean>
  >({});
  const [groupStreaks, setGroupStreaks] = useState<Record<string, GroupStreak>>(
    {},
  );
  const [joinErrorKind, setJoinErrorKind] = useState<ShareErrorKind | null>(
    null,
  );
  // Actions read the latest workspace rather than the one captured when the
  // callback was made, so two taps in the same frame both land.
  const current = useRef(workspace);

  useEffect(() => {
    current.current = workspace;
  }, [workspace]);

  const run = useCallback(
    (result: UseCaseResult) => {
      if (result.events.length === 0) return;

      current.current = result.workspace;
      setWorkspace(result.workspace);
      result.events.forEach(event => bus.publish(event));
    },
    [bus],
  );

  useEffect(() => {
    let isCurrent = true;

    Promise.all([
      taskStore.load().catch(() => null),
      listStore.load().catch(() => null),
      progressStore.load().catch(() => null),
      trioStore.load().catch(() => null),
    ])
      .then(([tasks, lists, progress, trio]) => {
        if (!isCurrent) return;

        const now = clock.now();
        const stored = sanitizeWorkspace({ tasks, lists, progress, trio }, now);

        setRestored(stored);
        // The day is planned before the first paint, so nobody sees the trio
        // being assembled after the screen has already appeared.
        const planned = planDay(stored, now, dayCapacity);

        current.current = planned.workspace;
        setWorkspace(planned.workspace);
        planned.events.forEach(event => bus.publish(event));
      })
      .catch(() => {
        // A store that cannot be read is an empty app, not a spinner that
        // never resolves.
        if (isCurrent) setRestored(EMPTY_WORKSPACE);
      });

    return () => {
      isCurrent = false;
    };
  }, [bus, clock, dayCapacity, listStore, progressStore, taskStore, trioStore]);

  useEffect(() => {
    if (restored == null) return;

    return createPersistenceSubscriber(bus, {
      listStore,
      progressStore,
      taskStore,
      trioStore,
      restored,
    });
  }, [bus, listStore, progressStore, restored, taskStore, trioStore]);

  useEffect(() => {
    if (restored == null || identity == null) return;

    return createSharePushSubscriber(bus, {
      shareGateway,
      personId: identity.personId,
    });
  }, [bus, identity, restored, shareGateway]);

  useEffect(() => createFeedbackSubscriber(bus, haptics), [bus, haptics]);

  useEffect(
    () => createUsageSubscriber(bus, usageReporter),
    [bus, usageReporter],
  );

  useEffect(
    () =>
      bus.on('trio.completed', event => {
        setCelebratingStreak(event.streakDays);
        setStreakPulse(pulse => pulse + 1);
      }),
    [bus],
  );

  useEffect(() => {
    const timer = setInterval(() => setNowMs(clock.now()), CLOCK_TICK_MS);

    return () => clearInterval(timer);
  }, [clock]);

  // Midnight passes while the app is open more often than anyone expects — a
  // phone left on the desk overnight would otherwise still be showing
  // yesterday's three at breakfast. The clock tick above is what notices.
  const dayMs = startOfDay(nowMs);

  useEffect(() => {
    if (restored == null) return;

    run(planDay(current.current, clock.now(), dayCapacity));
  }, [clock, dayCapacity, dayMs, restored, run]);

  const capture = useCallback(
    (typed: string, overrides?: CaptureOverrides, tookMs?: number | null) => {
      const now = clock.now();

      run(
        captureTask(
          current.current,
          typed,
          { nowMs: now, createId, tookMs },
          overrides,
        ),
      );
    },
    [clock, run],
  );

  const toggle = useCallback(
    (taskId: string) =>
      run(
        toggleTask(
          current.current,
          taskId,
          clock.now(),
          identity?.personId ?? null,
        ),
      ),
    [clock, identity, run],
  );

  const remove = useCallback(
    (taskId: string) => run(deleteTask(current.current, taskId, clock.now())),
    [clock, run],
  );

  const edit = useCallback(
    (taskId: string, change: TaskEdit) =>
      run(editTask(current.current, taskId, change, clock.now())),
    [clock, run],
  );

  const reshuffle = useCallback(
    () => run(reshuffleDay(current.current, clock.now(), dayCapacity)),
    [clock, dayCapacity, run],
  );

  const moveIntoDay = useCallback(
    (taskId: string) =>
      run(commitTaskToDay(current.current, taskId, clock.now(), dayCapacity)),
    [clock, dayCapacity, run],
  );

  const createList = useCallback(
    (name: string, appearance?: ProjectAppearance) => {
      const before = current.current.lists;
      const result = createTaskList(
        current.current,
        name,
        clock.now(),
        appearance,
      );
      const created = wasListCreated(before, result.workspace.lists);

      run(result);
      return created;
    },
    [clock, run],
  );

  const renameList = useCallback(
    (listId: string, name: string, appearance?: ProjectAppearance) => {
      const result = renameTaskList(
        current.current,
        listId,
        name,
        clock.now(),
        appearance,
      );
      const changed = result.events.length > 0;

      run(result);
      return changed;
    },
    [clock, run],
  );

  const deleteList = useCallback(
    (listId: string) =>
      run(deleteTaskList(current.current, listId, clock.now())),
    [clock, run],
  );

  function errorKindOf(error: unknown): ShareErrorKind {
    return error instanceof ShareOperationError ? error.kind : 'unknown';
  }

  const createShareLink = useCallback(
    (listId: string, invitedAs: Exclude<ListRole, 'owner'>) => {
      const list = findListById(current.current.lists, listId);
      if (list == null || identity == null) return;

      const owner = {
        personId: identity.personId,
        name: identity.name,
        role: 'owner' as const,
        joined: true,
      };
      const tasks = current.current.tasks.filter(
        task => task.listId === listId,
      );

      setShareStatus('loading');
      setShareErrorKind(null);
      shareGateway
        .createLink(list, tasks, invitedAs, owner)
        .then(share => {
          run(shareTaskList(current.current, listId, share, clock.now()));
          setShareStatus('idle');
        })
        .catch(error => {
          setShareErrorKind(errorKindOf(error));
          setShareStatus('error');
        });
    },
    [clock, identity, run, shareGateway],
  );

  const changeInvitedAs = useCallback(
    (listId: string, invitedAs: Exclude<ListRole, 'owner'>) => {
      const list = findListById(current.current.lists, listId);
      if (list?.share == null) return;

      const share = { ...list.share, invitedAs };
      run(shareTaskList(current.current, listId, share, clock.now()));
    },
    [clock, run],
  );

  const copyShareLink = useCallback(
    (token: string) => clipboard.copy(buildInviteLink(token)),
    [clipboard],
  );

  const inviteToShareLink = useCallback(
    (token: string, message: string) =>
      clipboard.share(buildInviteLink(token), message),
    [clipboard],
  );

  const stopSharingList = useCallback(
    (listId: string) => {
      const list = findListById(current.current.lists, listId);
      if (list?.share == null) return;

      setShareStatus('loading');
      setShareErrorKind(null);
      shareGateway
        .revokeLink(list.share)
        .then(() => {
          run(stopSharing(current.current, listId, clock.now()));
          setShareStatus('idle');
        })
        .catch(error => {
          setShareErrorKind(errorKindOf(error));
          setShareStatus('error');
        });
    },
    [clock, run, shareGateway],
  );

  const removeShareMember = useCallback(
    (listId: string, personId: string) => {
      const list = findListById(current.current.lists, listId);
      if (list?.share == null) return;

      setShareStatus('loading');
      setShareErrorKind(null);
      shareGateway
        .removeMember(list.share, personId)
        .then(() => {
          run(
            removeShareMemberUseCase(
              current.current,
              listId,
              personId,
              clock.now(),
            ),
          );
          setShareStatus('idle');
        })
        .catch(error => {
          setShareErrorKind(errorKindOf(error));
          setShareStatus('error');
        });
    },
    [clock, run, shareGateway],
  );

  const leaveList = useCallback(
    (listId: string) => {
      const list = findListById(current.current.lists, listId);
      if (list?.share == null || identity == null) return;

      shareGateway.removeMember(list.share, identity.personId).catch(() => {
        // The device has already left locally either way — the remote
        // membership will fall out of date until the owner's next pull.
      });
      run(
        leaveSharedList(
          current.current,
          listId,
          identity.personId,
          clock.now(),
        ),
      );
    },
    [clock, identity, run, shareGateway],
  );

  const dayKey = useMemo(() => dayKeyOf(dayMs), [dayMs]);

  /** What this device took for today inside one shared project: the trio,
   * narrowed to that project. Nothing about how the day is going. */
  const myDayFor = useCallback(
    (listId: string, atMs: number): SharedMemberDay | null => {
      if (identity == null) return null;

      const taskIds = current.current.trio.taskIds.filter(id =>
        current.current.tasks.some(
          task => task.id === id && task.listId === listId,
        ),
      );

      return {
        personId: identity.personId,
        dayKey: dayKeyOf(atMs),
        taskIds,
        focusTaskId: null,
        updatedAtMs: atMs,
      };
    },
    [identity],
  );

  const publishMyDay = useCallback(
    (listId: string) => {
      const list = findListById(current.current.lists, listId);
      const day = myDayFor(listId, clock.now());
      if (list?.share == null || day == null) return;

      // Local first: my own line is on screen before the network answers.
      setSharedDays(previous => ({
        ...previous,
        [listId]: withMemberDay(previous[listId] ?? [], day),
      }));

      shareGateway.publishDay(list.share, day).catch(() => {
        setSharedDayOffline(previous => ({ ...previous, [listId]: true }));
      });
    },
    [clock, myDayFor, shareGateway],
  );

  const pullDaysFor = useCallback(
    (listId: string) => {
      const list = findListById(current.current.lists, listId);
      if (list?.share == null) return Promise.resolve();

      return shareGateway
        .pullDays(list.share, dayKeyOf(clock.now()))
        .then(days => {
          // What this device published stays on screen even if the remote
          // day came back without it — a failed publish must never take a
          // line that is already there off the band.
          const mine = myDayFor(listId, clock.now());

          setSharedDays(previous => ({
            ...previous,
            [listId]: mine == null ? days : withMemberDay(days, mine),
          }));
          setSharedDayOffline(previous => ({ ...previous, [listId]: false }));
        })
        .catch(() => {
          // Silence is not a state: whatever is already on the phone stays on
          // screen, with a line saying the day could not be fetched.
          setSharedDayOffline(previous => ({ ...previous, [listId]: true }));
        });
    },
    [clock, myDayFor, shareGateway],
  );

  useEffect(() => {
    let isCurrent = true;

    groupStreakStore
      .load()
      .then(stored => {
        if (!isCurrent || typeof stored !== 'object' || stored === null) return;

        const entries = Object.entries(stored as Record<string, unknown>).map(
          ([listId, value]) => [listId, sanitizeGroupStreak(value)] as const,
        );
        setGroupStreaks(Object.fromEntries(entries));
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, [groupStreakStore]);

  // Publishing the day again only when what was taken actually changed: the
  // clock ticks every minute and none of those ticks is news.
  const publishedRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (restored == null || identity == null) return;

    for (const list of workspace.lists) {
      if (list.share == null) continue;

      const day = myDayFor(list.id, dayMs);
      if (day == null) continue;

      const signature = `${day.dayKey}:${[...day.taskIds].sort().join(',')}`;
      if (publishedRef.current[list.id] === signature) continue;

      publishedRef.current[list.id] = signature;
      publishMyDay(list.id);
    }
  }, [
    dayMs,
    identity,
    myDayFor,
    publishMyDay,
    restored,
    workspace.lists,
    workspace.tasks,
    workspace.trio,
  ]);

  useEffect(() => {
    for (const list of workspace.lists) {
      if (list.share == null) continue;

      const tasks = workspace.tasks.filter(task => task.listId === list.id);
      const entries = sharedDay(
        list.share.members,
        sharedDays[list.id] ?? [],
        tasks,
        dayMs,
      );
      if (!isGroupDayClosed(list.share.members, entries)) continue;

      setGroupStreaks(previous => {
        const streak = previous[list.id] ?? EMPTY_GROUP_STREAK;
        const next = advanceGroupStreak(streak, dayKey, true);
        if (next === streak) return previous;

        const merged = { ...previous, [list.id]: next };
        groupStreakStore.save(merged).catch(() => null);
        return merged;
      });
    }
  }, [
    dayKey,
    dayMs,
    groupStreakStore,
    sharedDays,
    workspace.lists,
    workspace.tasks,
  ]);

  const refreshSharedList = useCallback(
    (listId: string) => {
      const list = findListById(current.current.lists, listId);
      if (list?.share == null) return Promise.resolve();

      setShareStatus('loading');
      setShareErrorKind(null);
      return shareGateway
        .pull(list.share)
        .then(remote => {
          if (remote == null) {
            // Taken down by its owner: this device gets the same outcome as
            // a local delete, tasks and all moved to Caixa.
            run(deleteTaskList(current.current, listId, clock.now()));
          } else {
            run(applyRemoteList(current.current, listId, remote, clock.now()));
          }
          setShareStatus('idle');
        })
        .catch(error => {
          setShareErrorKind(errorKindOf(error));
          setShareStatus('error');
        })
        .then(() => pullDaysFor(listId));
    },
    [clock, pullDaysFor, run, shareGateway],
  );

  const refreshAllSharedLists = useCallback(() => {
    const shared = current.current.lists.filter(list => list.share != null);
    return Promise.all(shared.map(list => refreshSharedList(list.id)));
  }, [refreshSharedList]);

  const joinSharedList = useCallback(
    (pastedInput: string): Promise<boolean> => {
      const token = parseInviteToken(pastedInput);
      if (token == null || identity == null) {
        setJoinErrorKind('invalid-invite');
        setJoinStatus('error');
        return Promise.resolve(false);
      }

      // `role` here is only a placeholder to satisfy the port's type — the
      // gateway derives the real role from the link's own `invitedAs`, never
      // from what this device claims.
      const joiner = {
        personId: identity.personId,
        name: identity.name,
        role: 'viewer' as const,
        joined: true,
      };

      setJoinStatus('loading');
      setJoinErrorKind(null);
      return shareGateway
        .joinByToken(token, joiner)
        .then(incoming => {
          const granted =
            incoming.list.share?.members.find(
              member => member.personId === identity.personId,
            ) ?? joiner;

          run(acceptInvite(current.current, incoming, granted, clock.now()));
          setJoinStatus('idle');
          return true;
        })
        .catch(error => {
          setJoinErrorKind(errorKindOf(error));
          setJoinStatus('error');
          return false;
        });
    },
    [clock, identity, run, shareGateway],
  );

  const dismissShareError = useCallback(() => {
    setShareStatus('idle');
    setShareErrorKind(null);
  }, []);

  const pasteFromClipboard = useCallback(() => clipboard.paste(), [clipboard]);

  const dismissJoinError = useCallback(() => {
    setJoinStatus('idle');
    setJoinErrorKind(null);
  }, []);

  const today = useMemo(
    () => trioTasks(workspace.trio, workspace.tasks),
    [workspace.tasks, workspace.trio],
  );

  const listOf = useCallback(
    (listId: string) => findListById(workspace.lists, listId),
    [workspace.lists],
  );

  const level = getLevelProgress(workspace.progress.points);

  return {
    isRestored: restored != null,
    nowMs,
    workspace,
    lists: workspace.lists,
    tasks: workspace.tasks,
    today,
    dayCapacity,
    doneToday: trioDoneCount(workspace.trio, workspace.tasks),
    isDayClosed: isTrioComplete(workspace.trio, workspace.tasks),
    backlog: backlogCount(workspace.trio, workspace.tasks),
    openTaskCount: workspace.tasks.filter(isOpen).length,
    streakDays: getStreakDays(workspace.progress, nowMs),
    streakPulse,
    points: workspace.progress.points,
    level,
    trioCount: getTrioCount(workspace.progress),
    week: getWeek(workspace.progress, nowMs),
    celebratingStreak,
    dismissCelebration: () => setCelebratingStreak(null),
    listOf,
    capture,
    toggle,
    remove,
    edit,
    reshuffle,
    moveIntoDay,
    createList,
    renameList,
    deleteList,
    identity,
    shareStatus,
    shareErrorKind,
    joinStatus,
    joinErrorKind,
    createShareLink,
    changeInvitedAs,
    copyShareLink,
    inviteToShareLink,
    stopSharingList,
    removeShareMember,
    leaveList,
    refreshSharedList,
    refreshAllSharedLists,
    sharedDays,
    sharedDayOffline,
    groupStreaks,
    joinSharedList,
    pasteFromClipboard,
    dismissShareError,
    dismissJoinError,
  };
}

export type TasksViewModel = ReturnType<typeof useTasksViewModel>;
