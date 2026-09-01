import {
  dayKeyOf,
  type SharedMemberDay,
} from '../src/features/tasks/domain/SharedMemberDay';
import type { Task } from '../src/features/tasks/domain/Task';
import type { ListMember } from '../src/features/tasks/domain/TaskList';
import { ShareOperationError } from '../src/features/tasks/domain/ShareError';
import {
  advanceGroupStreak,
  isGroupDayClosed,
  sharedDay,
  sharedDayStatusOf,
  EMPTY_GROUP_STREAK,
} from '../src/features/tasks/presentation/models/sharedDay';

const NOW = new Date(2026, 8, 1, 10, 0, 0).getTime();
const TODAY = dayKeyOf(NOW);
const YESTERDAY = dayKeyOf(new Date(2026, 7, 31, 10, 0, 0).getTime());

function member(personId: string, name: string, joined = true): ListMember {
  return { personId, name, handle: null, role: 'editor', joined };
}

function task(id: string, completedAtMs: number | null = null): Task {
  return {
    id,
    title: `Tarefa ${id}`,
    listId: 'lancamento',
    priority: 'medium',
    dueAtMs: null,
    estimatedMinutes: null,
    createdAtMs: NOW - 1000,
    completedAtMs,
    completedBy: completedAtMs == null ? null : 'p-1',
  };
}

function day(
  personId: string,
  taskIds: readonly string[],
  focusTaskId: string | null = null,
  dayKey: string = TODAY,
): SharedMemberDay {
  return { personId, dayKey, taskIds, focusTaskId, updatedAtMs: NOW };
}

describe('sharedDay', () => {
  it('reads as focusing, then open, then done, then absent', () => {
    const members = [
      member('p-1', 'Joana'),
      member('p-2', 'Rafa'),
      member('p-3', 'Vera'),
      member('p-4', 'Caio'),
    ];
    const tasks = [task('t-1'), task('t-2'), task('t-3', NOW - 500)];
    const days = [
      day('p-1', ['t-3']),
      day('p-2', ['t-1']),
      day('p-3', ['t-2'], 't-2'),
      day('p-4', []),
    ];

    expect(
      sharedDay(members, days, tasks, NOW).map(entry => entry.state),
    ).toEqual(['focusing', 'open', 'done', 'absent']);
  });

  it('shows nobody who took nothing as absent, with no task', () => {
    const members = [member('p-1', 'Joana')];
    const entries = sharedDay(members, [day('p-1', [])], [], NOW);

    expect(entries).toHaveLength(1);
    expect(entries[0].state).toBe('absent');
    expect(entries[0].task).toBeNull();
  });

  it('leaves out a member whose day has not arrived', () => {
    const members = [member('p-1', 'Joana'), member('p-2', 'Rafa')];
    const entries = sharedDay(members, [day('p-1', [])], [], NOW);

    expect(entries).toHaveLength(1);
    expect(entries[0].member.personId).toBe('p-1');
  });

  it('leaves out a day published for another day', () => {
    const members = [member('p-1', 'Joana')];

    expect(
      sharedDay(members, [day('p-1', [], null, YESTERDAY)], [], NOW),
    ).toEqual([]);
  });

  it('leaves out a member whose tasks have not arrived yet', () => {
    const members = [member('p-1', 'Joana')];

    // Published a task this device has never seen: silence about the task is
    // not the same as taking nothing.
    expect(sharedDay(members, [day('p-1', ['t-9'])], [], NOW)).toEqual([]);
  });

  it('breaks a tie between several tasks: focus, then open, then last closed', () => {
    const members = [member('p-1', 'Joana')];
    const tasks = [task('t-1', NOW - 900), task('t-2', NOW - 100), task('t-3')];

    expect(
      sharedDay(
        members,
        [day('p-1', ['t-1', 't-2', 't-3'], 't-3')],
        tasks,
        NOW,
      )[0],
    ).toMatchObject({ state: 'focusing', task: tasks[2] });

    expect(
      sharedDay(members, [day('p-1', ['t-1', 't-2', 't-3'])], tasks, NOW)[0],
    ).toMatchObject({ state: 'open', task: tasks[2] });

    expect(
      sharedDay(members, [day('p-1', ['t-1', 't-2'])], tasks, NOW)[0],
    ).toMatchObject({ state: 'done', task: tasks[1] });
  });

  it('leaves out a pending invite', () => {
    const members = [member('p-1', 'Joana'), member('p-2', 'Rafa', false)];
    const days = [day('p-1', []), day('p-2', [])];

    expect(
      sharedDay(members, days, [], NOW).map(e => e.member.personId),
    ).toEqual(['p-1']);
  });

  it('is a pure function: it never reads the clock', () => {
    const realNow = Date.now;
    Date.now = () => {
      throw new Error('sharedDay must not read the clock');
    };

    try {
      expect(() =>
        sharedDay([member('p-1', 'Joana')], [day('p-1', [])], [], NOW),
      ).not.toThrow();
    } finally {
      Date.now = realNow;
    }
  });

  it('answers the same thing for the same arguments', () => {
    const members = [member('p-1', 'Joana')];
    const tasks = [task('t-1')];
    const days = [day('p-1', ['t-1'])];

    expect(sharedDay(members, days, tasks, NOW)).toEqual(
      sharedDay(members, days, tasks, NOW),
    );
  });
});

describe('group streak', () => {
  const members = [member('p-1', 'Joana'), member('p-2', 'Rafa')];

  it('counts a day only when everybody in the project closed', () => {
    const tasks = [task('t-1', NOW - 10), task('t-2', NOW - 20)];
    const closed = sharedDay(
      members,
      [day('p-1', ['t-1']), day('p-2', ['t-2'])],
      tasks,
      NOW,
    );

    expect(isGroupDayClosed(members, closed)).toBe(true);
    expect(
      isGroupDayClosed(
        members,
        sharedDay(members, [day('p-1', ['t-1'])], tasks, NOW),
      ),
    ).toBe(false);
  });

  it('adds a day in a row and never punishes a gap', () => {
    const first = advanceGroupStreak(EMPTY_GROUP_STREAK, YESTERDAY, true);
    expect(first).toEqual({ lastDayKey: YESTERDAY, days: 1 });

    const second = advanceGroupStreak(first, TODAY, true);
    expect(second).toEqual({ lastDayKey: TODAY, days: 2 });

    expect(advanceGroupStreak(second, TODAY, true)).toBe(second);
    expect(advanceGroupStreak(second, TODAY, false)).toBe(second);
  });
});

describe('sharedDayStatusOf', () => {
  it('calls only a network failure offline', () => {
    expect(sharedDayStatusOf(new ShareOperationError('network'))).toBe(
      'offline',
    );
  });

  it('never dresses a refused or broken answer as a missing network', () => {
    expect(sharedDayStatusOf(new ShareOperationError('forbidden'))).toBe(
      'error',
    );
    expect(sharedDayStatusOf(new ShareOperationError('unknown'))).toBe('error');
    expect(sharedDayStatusOf(new ShareOperationError('invalid-invite'))).toBe(
      'error',
    );
    expect(sharedDayStatusOf(new Error('boom'))).toBe('error');
    expect(sharedDayStatusOf(null)).toBe('error');
  });
});
