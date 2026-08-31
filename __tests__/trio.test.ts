import { DAY_MS, startOfDay } from '../src/features/tasks/domain/Day';
import type { Task } from '../src/features/tasks/domain/Task';
import {
  assembleTrio,
  backlogCount,
  isTrioComplete,
  isTrioStale,
  proposeTrio,
  refreshTrio,
  sanitizeTrio,
  DEFAULT_DAY_CAPACITY,
  UNLIMITED_DAY,
  trioDoneCount,
} from '../src/features/tasks/domain/Trio';

const now = new Date(2026, 7, 25, 10, 0).getTime();

function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: overrides.id,
    listId: 'inbox',
    priority: 'medium',
    dueAtMs: null,
    estimatedMinutes: null,
    createdAtMs: now,
    completedAtMs: null,
    ...overrides,
  };
}

describe('trio', () => {
  it('puts priority first, whatever the dates say', () => {
    const lateAndLow = task({
      id: 'late',
      dueAtMs: now - DAY_MS,
      priority: 'low',
    });
    const todayMedium = task({ id: 'today', dueAtMs: now + 3600000 });
    const heavyNoDate = task({ id: 'heavy', priority: 'high' });

    expect(
      proposeTrio([lateAndLow, todayMedium, heavyNoDate], now).map(t => t.id),
    ).toEqual(['heavy', 'today', 'late']);
  });

  it('keeps date order inside one priority', () => {
    const late = task({ id: 'late', dueAtMs: now - DAY_MS });
    const soon = task({ id: 'soon', dueAtMs: now + 3600000 });
    const undated = task({ id: 'undated' });

    expect(proposeTrio([undated, soon, late], now).map(t => t.id)).toEqual([
      'late',
      'soon',
      'undated',
    ]);
  });

  it('takes everything open when the day has no ceiling', () => {
    const tasks = ['a', 'b', 'c', 'd', 'e'].map(id => task({ id }));

    expect(proposeTrio(tasks, now, UNLIMITED_DAY)).toHaveLength(5);
    expect(assembleTrio(tasks, now, UNLIMITED_DAY).taskIds).toHaveLength(5);
  });

  it('honours a bigger day when one is chosen', () => {
    const tasks = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => task({ id }));

    expect(proposeTrio(tasks, now, 5)).toHaveLength(5);
  });

  it('never proposes more than three, or anything already done', () => {
    const tasks = ['a', 'b', 'c', 'd'].map(id => task({ id }));
    const done = task({ id: 'e', completedAtMs: now });

    expect(proposeTrio([...tasks, done], now)).toHaveLength(
      DEFAULT_DAY_CAPACITY,
    );
    expect(proposeTrio([...tasks, done], now).map(t => t.id)).not.toContain(
      'e',
    );
  });

  it('lets an old task climb past a newer one of the same weight', () => {
    const fresh = task({ id: 'fresh' });
    const old = task({ id: 'old', createdAtMs: now - 20 * DAY_MS });

    expect(proposeTrio([fresh, old], now)[0].id).toBe('old');
  });

  it('keeps today’s choice and only fills what is empty', () => {
    const tasks = [task({ id: 'a' }), task({ id: 'b' }), task({ id: 'c' })];
    const chosen = { dayMs: startOfDay(now), taskIds: ['a'] };
    const refreshed = refreshTrio(chosen, tasks, now);

    expect(refreshed.taskIds[0]).toBe('a');
    expect(refreshed.taskIds).toHaveLength(3);
  });

  it('replaces a selection made on another day', () => {
    const tasks = [task({ id: 'a' }), task({ id: 'b' })];
    const yesterday = { dayMs: startOfDay(now) - DAY_MS, taskIds: ['a'] };

    expect(isTrioStale(yesterday, now)).toBe(true);
    expect(refreshTrio(yesterday, tasks, now).dayMs).toBe(startOfDay(now));
  });

  it('drops a task that no longer exists', () => {
    const tasks = [task({ id: 'a' })];
    const chosen = { dayMs: startOfDay(now), taskIds: ['a', 'gone'] };

    expect(refreshTrio(chosen, tasks, now).taskIds).toEqual(['a']);
  });

  it('returns the same selection when nothing moved', () => {
    const tasks = [task({ id: 'a' }), task({ id: 'b' }), task({ id: 'c' })];
    const chosen = assembleTrio(tasks, now);

    expect(refreshTrio(chosen, tasks, now)).toBe(chosen);
  });

  it('counts a day closed when it had something in it and all of it is done', () => {
    const tasks = [
      task({ id: 'a', completedAtMs: now }),
      task({ id: 'b', completedAtMs: now }),
      task({ id: 'c' }),
    ];
    const chosen = { dayMs: startOfDay(now), taskIds: ['a', 'b', 'c'] };

    expect(trioDoneCount(chosen, tasks)).toBe(2);
    expect(isTrioComplete(chosen, tasks)).toBe(false);
    // Two chosen, two done: the day is closed even though it was not full.
    // Requiring a full day stopped making sense once the size became a choice.
    expect(
      isTrioComplete({ dayMs: startOfDay(now), taskIds: ['a', 'b'] }, tasks),
    ).toBe(true);
    // An empty day is not a closed day.
    expect(isTrioComplete({ dayMs: startOfDay(now), taskIds: [] }, tasks)).toBe(
      false,
    );
  });

  it('counts the backlog as everything open outside the day', () => {
    const tasks = [task({ id: 'a' }), task({ id: 'b' }), task({ id: 'c' })];

    expect(
      backlogCount({ dayMs: startOfDay(now), taskIds: ['a'] }, tasks),
    ).toBe(2);
  });

  it('reads a stored selection defensively', () => {
    expect(sanitizeTrio(null, now)).toEqual({ dayMs: 0, taskIds: [] });
    expect(
      sanitizeTrio({ dayMs: now, taskIds: [1, 'a'] }, now).taskIds,
    ).toEqual(['a']);
    // A day in the future is a clock that moved, not a plan.
    expect(
      sanitizeTrio({ dayMs: now + 10 * DAY_MS, taskIds: ['a'] }, now).taskIds,
    ).toEqual([]);
  });
});
