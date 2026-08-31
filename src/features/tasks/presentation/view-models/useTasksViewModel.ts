import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Clock } from '../../application/ports/Clock';
import type { Haptics } from '../../application/ports/Haptics';
import type { ListStore } from '../../application/ports/ListStore';
import type { ProgressStore } from '../../application/ports/ProgressStore';
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
import { toggleTask } from '../../application/useCases/toggleTask';
import {
  getLevelProgress,
  getStreakDays,
  getTrioCount,
  getWeek,
} from '../../domain/Progress';
import { startOfDay } from '../../domain/Day';
import { isOpen } from '../../domain/Task';
import { findListById } from '../../domain/TaskList';
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
    dayCapacity = DEFAULT_DAY_CAPACITY,
  } = dependencies;

  const [workspace, setWorkspace] = useState<Workspace>(EMPTY_WORKSPACE);
  const [restored, setRestored] = useState<Workspace | null>(null);
  const [nowMs, setNowMs] = useState(() => clock.now());
  const [celebratingStreak, setCelebratingStreak] = useState<number | null>(
    null,
  );
  const [streakPulse, setStreakPulse] = useState(0);
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
    (taskId: string) => run(toggleTask(current.current, taskId, clock.now())),
    [clock, run],
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
  };
}

export type TasksViewModel = ReturnType<typeof useTasksViewModel>;
