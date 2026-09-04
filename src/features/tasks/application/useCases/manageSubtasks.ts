import { createId } from '../../../../shared/identity/createId';
import {
  addSubtask as addToList,
  removeSubtask as removeFromList,
  renameSubtask as renameInList,
  toggleSubtask as toggleInList,
  type Subtask,
} from '../../domain/Subtask';
import { findTask, replaceTask, type Task } from '../../domain/Task';
import type { TaskEvent, UseCaseResult } from '../../domain/TaskEvent';
import type { Workspace } from '../../domain/Workspace';

/**
 * The steps inside one task.
 *
 * Every one of these goes through the same door: read the task, hand its list
 * to a pure helper, and commit only if the helper actually changed something.
 * None of them touches `progress` — a step is never worth a point, so slicing
 * a task into ten lines cannot buy a level.
 */
function commit(
  workspace: Workspace,
  task: Task,
  subtasks: readonly Subtask[],
  nowMs: number,
): UseCaseResult {
  if (subtasks === task.subtasks) return { workspace, events: [] };

  const next: Task = { ...task, subtasks };
  const workspaceNext: Workspace = {
    ...workspace,
    tasks: replaceTask(workspace.tasks, next),
  };
  const events: TaskEvent[] = [
    { type: 'task.subtasks.changed', at: nowMs, task: next, before: task },
    { type: 'workspace.committed', at: nowMs, workspace: workspaceNext },
  ];

  return { workspace: workspaceNext, events };
}

export function addSubtask(
  workspace: Workspace,
  taskId: string,
  title: string,
  nowMs: number,
): UseCaseResult {
  const task = findTask(workspace.tasks, taskId);

  if (task == null) return { workspace, events: [] };

  return commit(
    workspace,
    task,
    addToList(task.subtasks, title, nowMs, createId(nowMs)),
    nowMs,
  );
}

export function renameSubtask(
  workspace: Workspace,
  taskId: string,
  subtaskId: string,
  title: string,
  nowMs: number,
): UseCaseResult {
  const task = findTask(workspace.tasks, taskId);

  if (task == null) return { workspace, events: [] };

  return commit(
    workspace,
    task,
    renameInList(task.subtasks, subtaskId, title),
    nowMs,
  );
}

export function toggleSubtask(
  workspace: Workspace,
  taskId: string,
  subtaskId: string,
  nowMs: number,
): UseCaseResult {
  const task = findTask(workspace.tasks, taskId);

  if (task == null) return { workspace, events: [] };

  return commit(
    workspace,
    task,
    toggleInList(task.subtasks, subtaskId, nowMs),
    nowMs,
  );
}

export function deleteSubtask(
  workspace: Workspace,
  taskId: string,
  subtaskId: string,
  nowMs: number,
): UseCaseResult {
  const task = findTask(workspace.tasks, taskId);

  if (task == null) return { workspace, events: [] };

  return commit(
    workspace,
    task,
    removeFromList(task.subtasks, subtaskId),
    nowMs,
  );
}
