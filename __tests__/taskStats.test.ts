import { DAY_MS, startOfDay } from '../src/features/tasks/domain/Day';
import type { Task } from '../src/features/tasks/domain/Task';
import type { TaskList } from '../src/features/tasks/domain/TaskList';
import {
  getActiveProjects,
  getClosedByDay,
  getTaskBalance,
  getWeekdayPattern,
} from '../src/features/tasks/domain/TaskStats';

const NOW =
  startOfDay(new Date('2024-05-15T10:00:00').getTime()) + 10 * 3600000;

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Math.random()}`,
    title: 'Something',
    listId: 'inbox',
    priority: 'medium',
    dueAtMs: null,
    estimatedMinutes: null,
    createdAtMs: NOW - DAY_MS,
    completedAtMs: null,
    subtasks: [],
    ...overrides,
  };
}

function list(id: string): TaskList {
  return { id, name: id, color: 'sun', icon: 'layers' } as TaskList;
}

describe('getTaskBalance', () => {
  it('counts open and closed tasks', () => {
    const balance = getTaskBalance([
      task(),
      task(),
      task({ completedAtMs: NOW }),
    ]);

    expect(balance.open).toBe(2);
    expect(balance.closed).toBe(1);
    expect(balance.total).toBe(3);
    expect(balance.closedShare).toBeCloseTo(1 / 3);
  });

  it('draws an empty ring when there is nothing at all', () => {
    expect(getTaskBalance([])).toEqual({
      open: 0,
      closed: 0,
      total: 0,
      closedShare: 0,
    });
  });
});

describe('getClosedByDay', () => {
  it('keeps seven days, oldest first, with empty days in place', () => {
    const week = getClosedByDay(
      [
        task({ completedAtMs: NOW }),
        task({ completedAtMs: NOW }),
        task({ completedAtMs: NOW - 2 * DAY_MS }),
      ],
      NOW,
    );

    expect(week).toHaveLength(7);
    expect(week[6]).toEqual({ dayMs: startOfDay(NOW), closed: 2 });
    expect(week[4].closed).toBe(1);
    expect(week[0].closed).toBe(0);
  });

  it('leaves out anything older than the window', () => {
    const week = getClosedByDay(
      [task({ completedAtMs: NOW - 9 * DAY_MS })],
      NOW,
    );

    expect(week.every(day => day.closed === 0)).toBe(true);
  });
});

describe('getWeekdayPattern', () => {
  it('has no best day while nothing was closed', () => {
    const pattern = getWeekdayPattern([task()], NOW);

    expect(pattern.bestWeekday).toBeNull();
    expect(pattern.bestCount).toBe(0);
  });

  it('picks the weekday with the most closures', () => {
    const pattern = getWeekdayPattern(
      [
        task({ completedAtMs: NOW }),
        task({ completedAtMs: NOW - 7 * DAY_MS }),
        task({ completedAtMs: NOW - DAY_MS }),
      ],
      NOW,
    );

    expect(pattern.bestWeekday).toBe(new Date(NOW).getDay());
    expect(pattern.bestCount).toBe(2);
  });

  it('keeps the earliest weekday on a tie', () => {
    const sunday = startOfDay(new Date('2024-05-12T09:00:00').getTime());
    const monday = sunday + DAY_MS;
    const pattern = getWeekdayPattern(
      [
        task({ completedAtMs: sunday }),
        task({ completedAtMs: monday }),
        task({ completedAtMs: sunday - 7 * DAY_MS }),
        task({ completedAtMs: monday - 7 * DAY_MS }),
      ],
      NOW,
    );

    expect(pattern.bestWeekday).toBe(0);
    expect(pattern.byWeekday[1]).toBe(2);
  });

  it('names nobody while only a couple of tasks were closed', () => {
    const pattern = getWeekdayPattern(
      [task({ completedAtMs: NOW }), task({ completedAtMs: NOW - DAY_MS })],
      NOW,
    );

    expect(pattern.bestWeekday).toBeNull();
    expect(pattern.bestCount).toBe(0);
    expect(pattern.byWeekday[new Date(NOW).getDay()]).toBe(1);
  });

  it('names nobody while everything closed landed on one weekday', () => {
    const pattern = getWeekdayPattern(
      [
        task({ completedAtMs: NOW }),
        task({ completedAtMs: NOW }),
        task({ completedAtMs: NOW }),
        task({ completedAtMs: NOW }),
      ],
      NOW,
    );

    expect(pattern.bestWeekday).toBeNull();
  });
});

describe('getActiveProjects', () => {
  it('counts only projects that still hold something open', () => {
    const projects = getActiveProjects(
      [task({ listId: 'work' }), task({ listId: 'home', completedAtMs: NOW })],
      [list('work'), list('home'), list('inbox')],
    );

    expect(projects.active).toBe(1);
    expect(projects.total).toBe(3);
    expect(projects.share).toBeCloseTo(1 / 3);
  });

  it('survives having no project at all', () => {
    expect(getActiveProjects([], [])).toEqual({
      active: 0,
      total: 0,
      share: 0,
    });
  });
});
