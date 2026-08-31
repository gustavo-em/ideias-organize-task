import { captureTask } from '../src/features/tasks/application/useCases/captureTask';
import { toggleTask } from '../src/features/tasks/application/useCases/toggleTask';
import { TASK_WEIGHT } from '../src/features/tasks/domain/Task';
import type { TaskEvent } from '../src/features/tasks/domain/TaskEvent';
import { TRIO_BONUS_POINTS } from '../src/features/tasks/domain/Progress';
import {
  EMPTY_WORKSPACE,
  type Workspace,
} from '../src/features/tasks/domain/Workspace';

const now = new Date(2026, 7, 25, 10, 0).getTime();
let counter = 0;
const createId = () => `id-${(counter += 1)}`;

function withTasks(lines: readonly string[]): Workspace {
  counter = 0;

  return lines.reduce(
    (workspace, line, index) =>
      captureTask(workspace, line, { nowMs: now + index, createId }).workspace,
    EMPTY_WORKSPACE,
  );
}

function typesOf(events: readonly TaskEvent[]): readonly string[] {
  return events.map(event => event.type);
}

describe('toggle a task', () => {
  it('adds the task weight to the points', () => {
    // Three open tasks, one finished: the day is not closed yet, so the only
    // points on the board are the weight of what was done.
    const workspace = withTasks([
      'revisar contrato !alta',
      'outra',
      'mais uma',
    ]);
    const result = toggleTask(workspace, workspace.trio.taskIds[0], now);

    expect(result.workspace.progress.points).toBe(TASK_WEIGHT.high);
    expect(typesOf(result.events)).toEqual([
      'task.completed',
      'workspace.committed',
    ]);
  });

  it('closes a day that had one task in it, and pays the bonus', () => {
    // The rule is "everything in the day is done", not "the day was full":
    // with a capacity the person chooses, "full" stopped meaning anything.
    const workspace = withTasks(['revisar contrato !alta']);
    const result = toggleTask(workspace, workspace.tasks[0].id, now);

    expect(typesOf(result.events)).toContain('trio.completed');
    expect(result.workspace.progress.points).toBe(
      TASK_WEIGHT.high + TRIO_BONUS_POINTS,
    );
  });

  it('gives the task weight back when it is unticked', () => {
    const workspace = withTasks([
      'revisar contrato !alta',
      'outra',
      'mais uma',
    ]);
    const first = workspace.trio.taskIds[0];
    const done = toggleTask(workspace, first, now).workspace;
    const undone = toggleTask(done, first, now + 1000);

    expect(undone.workspace.progress.points).toBe(0);
    expect(typesOf(undone.events)).toEqual([
      'task.reopened',
      'workspace.committed',
    ]);
  });

  it('keeps the bonus of a day that was closed, like it keeps the streak', () => {
    // A correction made afterwards should not erase a day that happened.
    const workspace = withTasks(['revisar contrato !alta']);
    const closed = toggleTask(workspace, workspace.tasks[0].id, now).workspace;
    const reopened = toggleTask(closed, workspace.tasks[0].id, now + 1000);

    expect(reopened.workspace.progress.points).toBe(TRIO_BONUS_POINTS);
    expect(reopened.workspace.progress.streakDays).toBe(1);
  });

  it('announces the day closing only on the third one', () => {
    let workspace = withTasks(['uma', 'duas', 'três']);
    const ids = [...workspace.trio.taskIds];
    const seen: string[][] = [];

    for (const id of ids) {
      const result = toggleTask(workspace, id, now);

      workspace = result.workspace;
      seen.push([...typesOf(result.events)]);
    }

    expect(seen[0]).not.toContain('trio.completed');
    expect(seen[1]).not.toContain('trio.completed');
    expect(seen[2]).toContain('trio.completed');
    expect(workspace.progress.streakDays).toBe(1);
    expect(workspace.progress.points).toBe(
      TASK_WEIGHT.medium * 3 + TRIO_BONUS_POINTS,
    );
  });

  it('keeps the streak after a task is reopened', () => {
    let workspace = withTasks(['uma', 'duas', 'três']);

    for (const id of [...workspace.trio.taskIds]) {
      workspace = toggleTask(workspace, id, now).workspace;
    }

    const reopened = toggleTask(
      workspace,
      workspace.trio.taskIds[0],
      now + 1000,
    ).workspace;

    expect(reopened.progress.streakDays).toBe(1);
    expect(reopened.progress.points).toBe(
      TASK_WEIGHT.medium * 2 + TRIO_BONUS_POINTS,
    );
  });

  it('announces a new level when the points cross it', () => {
    let workspace = withTasks([
      'a !alta',
      'b !alta',
      'c !alta',
      'd !alta',
      'e !alta',
    ]);
    const levelEvents: TaskEvent[] = [];

    for (const task of [...workspace.tasks]) {
      const result = toggleTask(workspace, task.id, now);

      workspace = result.workspace;
      levelEvents.push(
        ...result.events.filter(event => event.type === 'level.reached'),
      );
    }

    expect(levelEvents.length).toBeGreaterThan(0);
    expect(levelEvents[0]).toMatchObject({ type: 'level.reached', level: 2 });
  });

  it('does nothing for a task that is not there', () => {
    const workspace = withTasks(['uma']);
    const result = toggleTask(workspace, 'missing', now);

    expect(result.workspace).toBe(workspace);
    expect(result.events).toEqual([]);
  });
});
