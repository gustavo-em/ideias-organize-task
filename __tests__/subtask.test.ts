import {
  addSubtask,
  MAX_SUBTASKS,
  removeSubtask,
  renameSubtask,
  sanitizeSubtasks,
  toggleSubtask,
  type Subtask,
} from '../src/features/tasks/domain/Subtask';
import {
  sanitizeTasks,
  subtaskProgress,
  withCompletion,
  withoutCompletion,
  type Task,
} from '../src/features/tasks/domain/Task';

const now = new Date(2026, 8, 1, 9, 0).getTime();

function step(id: string, overrides: Partial<Subtask> = {}): Subtask {
  return {
    id,
    title: id,
    completedAtMs: null,
    closedWithParent: false,
    createdAtMs: now,
    ...overrides,
  };
}

function task(subtasks: readonly Subtask[]): Task {
  return {
    id: 'a',
    title: 'Fechar o contrato',
    listId: 'inbox',
    priority: 'medium',
    dueAtMs: null,
    estimatedMinutes: null,
    createdAtMs: now,
    completedAtMs: null,
    subtasks,
  };
}

describe('subtasks', () => {
  it('adds a step to the end and refuses an empty one', () => {
    const one = addSubtask([], '  ligar   pro cartório  ', now, 's-1');

    expect(one.map(entry => entry.title)).toEqual(['ligar pro cartório']);
    expect(addSubtask(one, '   ', now, 's-2')).toBe(one);
  });

  it('stops at the limit instead of growing into a project', () => {
    let steps: readonly Subtask[] = [];

    for (let index = 0; index < MAX_SUBTASKS + 3; index += 1) {
      steps = addSubtask(steps, `passo ${index}`, now, `s-${index}`);
    }

    expect(steps).toHaveLength(MAX_SUBTASKS);
  });

  it('keeps the old name when a rename is erased to nothing', () => {
    const steps = [step('s-1', { title: 'assinar' })];

    expect(renameSubtask(steps, 's-1', 'assinar e enviar')[0].title).toBe(
      'assinar e enviar',
    );
    expect(renameSubtask(steps, 's-1', '   ')).toBe(steps);
    expect(renameSubtask(steps, 'missing', 'x')).toBe(steps);
  });

  it('ticks and unticks one step, and removes one', () => {
    const steps = [step('s-1'), step('s-2')];
    const ticked = toggleSubtask(steps, 's-1', now);

    expect(ticked[0].completedAtMs).toBe(now);
    expect(toggleSubtask(ticked, 's-1', now)[0].completedAtMs).toBeNull();
    expect(removeSubtask(ticked, 's-1').map(entry => entry.id)).toEqual([
      's-2',
    ]);
    expect(removeSubtask(ticked, 'missing')).toBe(ticked);
  });

  it('closes the open steps with the task and puts back only those', () => {
    const closedByHand = step('s-1', { completedAtMs: now - 1000 });
    const open = step('s-2');
    const done = withCompletion(task([closedByHand, open]), now);

    expect(done.subtasks[1].completedAtMs).toBe(now);
    expect(done.subtasks[1].closedWithParent).toBe(true);
    expect(done.subtasks[0].closedWithParent).toBe(false);

    const reopened = withoutCompletion(done);

    // The one ticked by hand stays ticked: reopening undoes what the task did,
    // never what the person did.
    expect(reopened.subtasks[0].completedAtMs).toBe(now - 1000);
    expect(reopened.subtasks[1].completedAtMs).toBeNull();
    expect(reopened.subtasks[1].closedWithParent).toBe(false);
  });

  it('counts what is done out of what there is', () => {
    expect(subtaskProgress(task([]))).toEqual({ done: 0, total: 0 });
    expect(
      subtaskProgress(task([step('s-1', { completedAtMs: now }), step('s-2')])),
    ).toEqual({ done: 1, total: 2 });
  });

  it('reads stored steps as untrusted input', () => {
    const steps = sanitizeSubtasks([
      { id: 's-1', title: ' comprar selo ', createdAtMs: now },
      { id: 's-1', title: 'duplicada' },
      { id: 's-2' },
      { title: 'sem id' },
      null,
      { id: 's-3', title: 'ok', completedAtMs: 'ontem', closedWithParent: 1 },
    ]);

    expect(steps.map(entry => entry.id)).toEqual(['s-1', 's-3']);
    expect(steps[0].title).toBe('comprar selo');
    expect(steps[1].completedAtMs).toBeNull();
    expect(steps[1].closedWithParent).toBe(false);
  });

  it('loads a task written before subtasks existed, with no steps', () => {
    const [restored] = sanitizeTasks([
      {
        id: 'old',
        title: 'Tarefa antiga',
        listId: 'inbox',
        priority: 'medium',
        createdAtMs: now,
      },
    ]);

    expect(restored.subtasks).toEqual([]);
  });
});
