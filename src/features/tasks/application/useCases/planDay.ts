import { startOfDay } from '../../domain/Day';
import { isOpen, type Task } from '../../domain/Task';
import type { TaskEvent, UseCaseResult } from '../../domain/TaskEvent';
import {
  assembleTrio,
  DEFAULT_DAY_CAPACITY,
  refreshTrio,
  taskUrgency,
  UNLIMITED_DAY,
} from '../../domain/Trio';
import type { Workspace } from '../../domain/Workspace';

/**
 * Brings the day's three up to date.
 *
 * Called when the app opens and whenever the list changes underneath it. A
 * trio from yesterday is replaced; today's is only topped up, so the three the
 * person accepted this morning are still the three they see this afternoon.
 */
export function planDay(
  workspace: Workspace,
  nowMs: number,
  capacity: number = DEFAULT_DAY_CAPACITY,
): UseCaseResult {
  const trio = refreshTrio(workspace.trio, workspace.tasks, nowMs, capacity);

  if (trio === workspace.trio) return { workspace, events: [] };

  const next: Workspace = { ...workspace, trio };

  return {
    workspace: next,
    events: [
      { type: 'trio.assembled', at: nowMs, taskIds: trio.taskIds },
      { type: 'workspace.committed', at: nowMs, workspace: next },
    ],
  };
}

/** Throws today's proposal away and asks for another one. */
export function reshuffleDay(
  workspace: Workspace,
  nowMs: number,
  capacity: number = DEFAULT_DAY_CAPACITY,
): UseCaseResult {
  const trio = assembleTrio(workspace.tasks, nowMs, capacity);
  const next: Workspace = { ...workspace, trio };

  return {
    workspace: next,
    events: [
      { type: 'trio.assembled', at: nowMs, taskIds: trio.taskIds },
      { type: 'workspace.committed', at: nowMs, workspace: next },
    ],
  };
}

/**
 * Puts one task into the day by hand.
 *
 * Choosing something takes the place of whatever is least urgent among the
 * three, never of something already finished: the day's record stays.
 */
export function commitTaskToDay(
  workspace: Workspace,
  taskId: string,
  nowMs: number,
  capacity: number = DEFAULT_DAY_CAPACITY,
): UseCaseResult {
  if (workspace.trio.taskIds.includes(taskId)) {
    return { workspace, events: [] };
  }

  const byId = new Map(workspace.tasks.map(task => [task.id, task]));
  const chosen = byId.get(taskId);

  if (chosen == null || !isOpen(chosen)) return { workspace, events: [] };

  const current = workspace.trio.taskIds
    .map(id => byId.get(id))
    .filter((task): task is Task => task != null);
  const openInTrio = current.filter(isOpen);
  let taskIds: readonly string[];

  const slots = capacity === UNLIMITED_DAY ? current.length + 1 : capacity;

  if (current.length < slots) {
    taskIds = [...current.map(task => task.id), taskId];
  } else if (openInTrio.length === 0) {
    // Every slot is already finished. Adding a fourth would turn a closed day
    // back into an open one, so the choice waits for tomorrow.
    return { workspace, events: [] };
  } else {
    const leastUrgent = openInTrio.reduce((worst, task) =>
      taskUrgency(task, nowMs) < taskUrgency(worst, nowMs) ? task : worst,
    );

    taskIds = workspace.trio.taskIds.map(id =>
      id === leastUrgent.id ? taskId : id,
    );
  }

  const trio = { dayMs: startOfDay(nowMs), taskIds };
  const next: Workspace = { ...workspace, trio };
  const events: TaskEvent[] = [
    { type: 'trio.assembled', at: nowMs, taskIds },
    { type: 'workspace.committed', at: nowMs, workspace: next },
  ];

  return { workspace: next, events };
}
