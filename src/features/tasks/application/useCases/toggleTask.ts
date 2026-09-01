import {
  getLevel,
  recordCompletion,
  recordReopen,
  recordTrioClosed,
} from '../../domain/Progress';
import {
  findTask,
  isCompleted,
  replaceTask,
  taskWeight,
  withCompletion,
  withoutCompletion,
} from '../../domain/Task';
import type { TaskEvent, UseCaseResult } from '../../domain/TaskEvent';
import { isTrioComplete } from '../../domain/Trio';
import type { Workspace } from '../../domain/Workspace';

/**
 * Ticks a task, or unticks one.
 *
 * Reopening gives the points back but never takes a streak away: the day was
 * closed, and a correction made afterwards should not erase a fortnight of
 * mornings.
 */
export function toggleTask(
  workspace: Workspace,
  taskId: string,
  nowMs: number,
  /** uid of whoever is closing it, so a shared project can show who did. */
  completedBy: string | null = null,
): UseCaseResult {
  const task = findTask(workspace.tasks, taskId);

  if (task == null) return { workspace, events: [] };

  const weight = taskWeight(task);
  const inTrio = workspace.trio.taskIds.includes(task.id);
  const events: TaskEvent[] = [];
  let next: Workspace;

  if (isCompleted(task)) {
    const reopened = withoutCompletion(task);

    next = {
      ...workspace,
      tasks: replaceTask(workspace.tasks, reopened),
      progress: recordReopen(workspace.progress, weight, nowMs),
    };
    events.push({ type: 'task.reopened', at: nowMs, task: reopened, weight });
  } else {
    const completed = withCompletion(task, nowMs, completedBy);
    const tasks = replaceTask(workspace.tasks, completed);
    const levelBefore = getLevel(workspace.progress.points);
    let progress = recordCompletion(workspace.progress, weight, nowMs);

    events.push({
      type: 'task.completed',
      at: nowMs,
      task: completed,
      weight,
      inTrio,
    });

    if (isTrioComplete(workspace.trio, tasks)) {
      progress = recordTrioClosed(progress, nowMs);
      events.push({
        type: 'trio.completed',
        at: nowMs,
        streakDays: progress.streakDays,
        points: progress.points,
      });
    }

    if (getLevel(progress.points) > levelBefore) {
      events.push({
        type: 'level.reached',
        at: nowMs,
        level: getLevel(progress.points),
      });
    }

    next = { ...workspace, tasks, progress };
  }

  events.push({ type: 'workspace.committed', at: nowMs, workspace: next });

  return { workspace: next, events };
}
