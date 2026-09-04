import { captureTask } from '../src/features/tasks/application/useCases/captureTask';
import {
  addSubtask,
  deleteSubtask,
  renameSubtask,
  toggleSubtask,
} from '../src/features/tasks/application/useCases/manageSubtasks';
import { toggleTask } from '../src/features/tasks/application/useCases/toggleTask';
import { EMPTY_WORKSPACE } from '../src/features/tasks/domain/Workspace';
import type { Workspace } from '../src/features/tasks/domain/Workspace';

const now = new Date(2026, 8, 1, 9, 0).getTime();
let counter = 0;
const createId = () => `id-${(counter += 1)}`;

function withTask(): Workspace {
  counter = 0;
  return captureTask(EMPTY_WORKSPACE, 'fechar contrato', {
    nowMs: now,
    createId,
  }).workspace;
}

function withSteps(...titles: readonly string[]): Workspace {
  return titles.reduce(
    (workspace, title) =>
      addSubtask(workspace, workspace.tasks[0].id, title, now).workspace,
    withTask(),
  );
}

describe('manage subtasks', () => {
  it('adds a step and reports the fact, without touching the task itself', () => {
    const workspace = withTask();
    const result = addSubtask(workspace, workspace.tasks[0].id, 'assinar', now);

    expect(result.workspace.tasks[0].subtasks.map(step => step.title)).toEqual([
      'assinar',
    ]);
    expect(result.events.map(event => event.type)).toEqual([
      'task.subtasks.changed',
      'workspace.committed',
    ]);
  });

  it('does nothing for an unknown task or an empty title', () => {
    const workspace = withTask();

    expect(addSubtask(workspace, 'missing', 'x', now).events).toEqual([]);
    expect(
      addSubtask(workspace, workspace.tasks[0].id, '  ', now).events,
    ).toEqual([]);
  });

  it('renames, ticks and deletes one step', () => {
    const workspace = withSteps('assinar');
    const taskId = workspace.tasks[0].id;
    const stepId = workspace.tasks[0].subtasks[0].id;
    const renamed = renameSubtask(
      workspace,
      taskId,
      stepId,
      'assinar e enviar',
      now,
    ).workspace;

    expect(renamed.tasks[0].subtasks[0].title).toBe('assinar e enviar');

    const ticked = toggleSubtask(renamed, taskId, stepId, now).workspace;

    expect(ticked.tasks[0].subtasks[0].completedAtMs).toBe(now);
    expect(
      toggleSubtask(ticked, taskId, stepId, now).workspace.tasks[0].subtasks[0]
        .completedAtMs,
    ).toBeNull();

    expect(
      deleteSubtask(ticked, taskId, stepId, now).workspace.tasks[0].subtasks,
    ).toEqual([]);
  });

  it('never moves the score: steps are worth nothing on their own', () => {
    const workspace = withSteps('um', 'dois');
    const taskId = workspace.tasks[0].id;
    const ticked = toggleSubtask(
      workspace,
      taskId,
      workspace.tasks[0].subtasks[0].id,
      now,
    ).workspace;

    expect(ticked.progress).toBe(workspace.progress);

    const bothTicked = toggleSubtask(
      ticked,
      taskId,
      ticked.tasks[0].subtasks[1].id,
      now,
    ).workspace;

    // Finishing every step does not finish the task: the person closes it.
    expect(bothTicked.progress.points).toBe(workspace.progress.points);
    expect(bothTicked.tasks[0].completedAtMs).toBeNull();
  });

  it('closing the task closes the open steps, and reopening puts them back', () => {
    const workspace = withSteps('um', 'dois');
    const taskId = workspace.tasks[0].id;
    const firstTicked = toggleSubtask(
      workspace,
      taskId,
      workspace.tasks[0].subtasks[0].id,
      now,
    ).workspace;
    const closed = toggleTask(firstTicked, taskId, now + 1000).workspace;

    expect(
      closed.tasks[0].subtasks.every(step => step.completedAtMs != null),
    ).toBe(true);

    const reopened = toggleTask(closed, taskId, now + 2000).workspace;

    expect(reopened.tasks[0].subtasks[0].completedAtMs).toBe(now);
    expect(reopened.tasks[0].subtasks[1].completedAtMs).toBeNull();
  });
});
