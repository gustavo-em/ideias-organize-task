import { DAY_MS } from '../src/features/tasks/domain/Day';
import {
  findTask,
  isDueToday,
  isOverdue,
  replaceTask,
  sanitizeTasks,
  TASK_WEIGHT,
  taskWeight,
  withCompletion,
  withoutCompletion,
  type Task,
} from '../src/features/tasks/domain/Task';

const now = new Date(2026, 7, 25, 12, 0).getTime();

const base: Task = {
  id: 'a',
  title: 'Escrever proposta',
  listId: 'inbox',
  priority: 'high',
  dueAtMs: null,
  estimatedMinutes: null,
  createdAtMs: now,
  completedAtMs: null,
};

describe('task', () => {
  it('weighs a task by its priority and nothing else', () => {
    expect(taskWeight(base)).toBe(TASK_WEIGHT.high);
    expect(taskWeight({ ...base, priority: 'low' })).toBe(TASK_WEIGHT.low);
  });

  it('is late only when it is open and its time has passed', () => {
    const late = { ...base, dueAtMs: now - 1000 };

    expect(isOverdue(late, now)).toBe(true);
    expect(isOverdue({ ...late, completedAtMs: now }, now)).toBe(false);
    expect(isOverdue(base, now)).toBe(false);
  });

  it('reads a due date as today across the whole day', () => {
    expect(isDueToday({ ...base, dueAtMs: now - 6 * 3600000 }, now)).toBe(true);
    expect(isDueToday({ ...base, dueAtMs: now + DAY_MS }, now)).toBe(false);
  });

  it('keeps the same object when completion does not change', () => {
    const done = withCompletion(base, now);

    expect(withCompletion(done, now + 5)).toBe(done);
    expect(withoutCompletion(base)).toBe(base);
    expect(withoutCompletion(done).completedAtMs).toBeNull();
  });

  it('returns the same list when there is nothing to replace', () => {
    const tasks = [base];

    expect(replaceTask(tasks, { ...base, id: 'other' })).toBe(tasks);
    expect(replaceTask(tasks, { ...base, title: 'x' })[0].title).toBe('x');
    expect(findTask(tasks, null)).toBeNull();
  });

  it('drops stored entries it cannot understand', () => {
    const stored = [
      { id: 'a', title: 'Válida' },
      { id: 'a', title: 'Repetida' },
      { id: 'b', title: '   ' },
      { title: 'Sem id' },
      null,
      'lixo',
    ];
    const tasks = sanitizeTasks(stored);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 'a',
      title: 'Válida',
      priority: 'medium',
      listId: 'inbox',
    });
  });

  it('reads nothing from something that is not a list', () => {
    expect(sanitizeTasks(undefined)).toEqual([]);
    expect(sanitizeTasks({ tasks: [] })).toEqual([]);
  });
});
