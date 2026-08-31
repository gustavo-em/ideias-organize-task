import { findTask, isCompleted, taskWeight } from '../../domain/Task';
import type { TaskEvent, UseCaseResult } from '../../domain/TaskEvent';
import { refreshTrio } from '../../domain/Trio';
import { recordReopen } from '../../domain/Progress';
import type { Workspace } from '../../domain/Workspace';

/**
 * Removes a task for good.
 *
 * Deleting something already finished takes its points with it, for the same
 * reason reopening does: points that survive the work disappearing are points
 * that can be manufactured.
 */
export function deleteTask(
  workspace: Workspace,
  taskId: string,
  nowMs: number,
): UseCaseResult {
  const task = findTask(workspace.tasks, taskId);

  if (task == null) return { workspace, events: [] };

  const tasks = workspace.tasks.filter(entry => entry.id !== taskId);
  const progress = isCompleted(task)
    ? recordReopen(workspace.progress, taskWeight(task), nowMs)
    : workspace.progress;
  const trio = refreshTrio(workspace.trio, tasks, nowMs);
  const next: Workspace = { ...workspace, tasks, progress, trio };
  const events: TaskEvent[] = [{ type: 'task.deleted', at: nowMs, task }];

  if (trio !== workspace.trio) {
    events.push({ type: 'trio.assembled', at: nowMs, taskIds: trio.taskIds });
  }

  events.push({ type: 'workspace.committed', at: nowMs, workspace: next });

  return { workspace: next, events };
}
