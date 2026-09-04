import { captureTask } from '../src/features/tasks/application/useCases/captureTask';
import { deleteTask } from '../src/features/tasks/application/useCases/deleteTask';
import { editTask } from '../src/features/tasks/application/useCases/editTask';
import { toggleTask } from '../src/features/tasks/application/useCases/toggleTask';
import { REMINDER_HOUR } from '../src/features/tasks/domain/DeadlineReminder';
import {
  desiredReminderAlerts,
  nextOccurrenceAtMs,
  upcomingOccurrences,
} from '../src/features/tasks/domain/Reminder';
import {
  isOpen,
  isReminder,
  sanitizeTasks,
  type Task,
} from '../src/features/tasks/domain/Task';
import { getTaskBalance } from '../src/features/tasks/domain/TaskStats';
import {
  isTrioComplete,
  refreshTrio,
  trioTasks,
} from '../src/features/tasks/domain/Trio';
import { EMPTY_WORKSPACE } from '../src/features/tasks/domain/Workspace';
import { syncReminderAlerts } from '../src/features/tasks/infrastructure/notifications/notifeeReminderScheduler';

const now = new Date(2026, 7, 30, 10, 0).getTime();
let counter = 0;
const createId = () => `id-${(counter += 1)}`;

const scheduled = (
  jest.requireMock('@notifee/react-native') as unknown as {
    __triggers: Map<
      string,
      {
        notification: { title: string; body: string };
        trigger: { type: number; timestamp: number };
      }
    >;
  }
).__triggers;

function atNoon(year: number, month: number, day: number): number {
  return new Date(year, month, day, 12, 0).getTime();
}

function reminder(
  dueAtMs: number,
  recurrence: 'once' | 'weekly' | 'monthly' | 'yearly',
) {
  counter = 0;
  return captureTask(
    EMPTY_WORKSPACE,
    'aniversário da Ana',
    { nowMs: now, createId },
    { dueAtMs, kind: 'reminder', recurrence },
  ).workspace;
}

beforeEach(() => {
  scheduled.clear();
  jest.clearAllMocks();
});

describe('when a reminder comes back', () => {
  it('speaks at nine in the morning of its own day', () => {
    const next = nextOccurrenceAtMs(atNoon(2026, 8, 12), 'once', now);

    expect(new Date(next as number).getHours()).toBe(REMINDER_HOUR);
    expect(new Date(next as number).getDate()).toBe(12);
  });

  it('has nothing left to say once a one-off day has passed', () => {
    expect(nextOccurrenceAtMs(atNoon(2026, 6, 1), 'once', now)).toBeNull();
  });

  it('returns the next year for a birthday already past this year', () => {
    const birthday = atNoon(1990, 2, 12);
    const next = nextOccurrenceAtMs(birthday, 'yearly', now);
    const date = new Date(next as number);

    expect(date.getFullYear()).toBe(2027);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(12);
  });

  it('keeps a birthday later this year in this year', () => {
    const date = new Date(
      nextOccurrenceAtMs(atNoon(1990, 11, 25), 'yearly', now) as number,
    );

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(11);
  });

  it('falls back to the 28th of February in a common year', () => {
    const date = new Date(
      nextOccurrenceAtMs(atNoon(2024, 1, 29), 'yearly', now) as number,
    );

    expect(date.getMonth()).toBe(1);
    expect(date.getDate()).toBe(28);
    expect(date.getFullYear()).toBe(2027);
  });

  it('lands on the last day of a month too short for the day asked for', () => {
    // The 31st, read on the 5th of February: February has 28 days in 2027.
    const february = new Date(2027, 1, 5, 10, 0).getTime();
    const date = new Date(
      nextOccurrenceAtMs(atNoon(2026, 0, 31), 'monthly', february) as number,
    );

    expect(date.getMonth()).toBe(1);
    expect(date.getDate()).toBe(28);
  });

  it('walks a week at a time', () => {
    const weekly = upcomingOccurrences(atNoon(2026, 7, 3), 'weekly', now, 3);

    expect(weekly).toHaveLength(3);
    expect(new Date(weekly[0]).getDay()).toBe(new Date(2026, 7, 3).getDay());
    expect(weekly[1] - weekly[0]).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('holds three occurrences ahead, and only one for a one-off', () => {
    expect(
      upcomingOccurrences(atNoon(2026, 8, 12), 'monthly', now, 3),
    ).toHaveLength(3);
    expect(
      upcomingOccurrences(atNoon(2026, 8, 12), 'once', now, 3),
    ).toHaveLength(1);
  });
});

describe('a reminder is not work', () => {
  const workspace = reminder(atNoon(2026, 8, 12), 'yearly');
  const item = workspace.tasks[0];

  it('is saved as a reminder, with its recurrence', () => {
    expect(isReminder(item)).toBe(true);
    expect(item.recurrence).toBe('yearly');
  });

  it('is never open, so it never counts among the open items', () => {
    expect(isOpen(item)).toBe(false);
    expect(getTaskBalance(workspace.tasks).open).toBe(0);
  });

  it('never enters the trio', () => {
    expect(refreshTrio(workspace.trio, workspace.tasks, now).taskIds).toEqual(
      [],
    );
  });

  it('cannot be ticked, so it pays no points', () => {
    const after = toggleTask(workspace, item.id, now);

    expect(after.events).toEqual([]);
    expect(after.workspace.progress.points).toBe(
      workspace.progress.points ?? 0,
    );
  });

  it('carries no priority weight, no estimate and no steps', () => {
    expect(item.estimatedMinutes).toBeNull();
    expect(item.remindDaysBefore).toBeNull();
    expect(item.subtasks).toEqual([]);
  });

  it('stays a task when it is asked for without a date', () => {
    counter = 0;
    const noDate = captureTask(
      EMPTY_WORKSPACE,
      'pagar o condomínio',
      { nowMs: now, createId },
      { dueAtMs: null, kind: 'reminder', recurrence: 'monthly' },
    ).workspace;

    expect(isReminder(noDate.tasks[0])).toBe(false);
  });
});

describe('turning one kind into the other', () => {
  it('keeps the title, the date and the space, and drops the steps', () => {
    counter = 0;
    const workspace = captureTask(
      EMPTY_WORKSPACE,
      'pagar o aluguel',
      { nowMs: now, createId },
      { dueAtMs: atNoon(2026, 8, 5), subtaskTitles: ['ver o boleto'] },
    ).workspace;
    const taskId = workspace.tasks[0].id;

    const turned = editTask(
      workspace,
      taskId,
      { kind: 'reminder', recurrence: 'monthly' },
      now,
    ).workspace;
    const item = turned.tasks[0];

    expect(item.title).toBe('pagar o aluguel');
    expect(item.dueAtMs).toBe(atNoon(2026, 8, 5));
    expect(item.listId).toBe(workspace.tasks[0].listId);
    expect(item.recurrence).toBe('monthly');
    expect(item.subtasks).toEqual([]);
  });

  it('frees the day slot a converted task was holding', () => {
    counter = 0;
    const captured = captureTask(
      EMPTY_WORKSPACE,
      'pagar o aluguel',
      { nowMs: now, createId },
      { dueAtMs: atNoon(2026, 7, 30) },
    ).workspace;
    const taskId = captured.tasks[0].id;

    expect(captured.trio.taskIds).toContain(taskId);

    const turned = editTask(
      captured,
      taskId,
      { kind: 'reminder', recurrence: 'monthly' },
      now,
    ).workspace;
    const refreshed = refreshTrio(turned.trio, turned.tasks, now);

    expect(refreshed.taskIds).not.toContain(taskId);
    expect(trioTasks(turned.trio, turned.tasks)).toEqual([]);
    expect(isTrioComplete(turned.trio, turned.tasks)).toBe(false);
  });

  it('drops the recurrence when it goes back to being work', () => {
    const workspace = reminder(atNoon(2026, 8, 12), 'monthly');
    const taskId = workspace.tasks[0].id;
    const back = editTask(workspace, taskId, { kind: 'task' }, now).workspace;

    expect(back.tasks[0].recurrence).toBeUndefined();
  });

  it('turns a reminder back into a task that can be ticked', () => {
    const workspace = reminder(atNoon(2026, 8, 12), 'weekly');
    const taskId = workspace.tasks[0].id;
    const back = editTask(workspace, taskId, { kind: 'task' }, now).workspace;

    expect(isOpen(back.tasks[0])).toBe(true);
    expect(toggleTask(back, taskId, now).events.length).toBeGreaterThan(0);
  });
});

describe('what comes off the disk', () => {
  it('reads a stored reminder back as one', () => {
    const stored = sanitizeTasks([
      {
        id: 'r1',
        title: 'aniversário',
        listId: 'inbox',
        dueAtMs: atNoon(2026, 8, 12),
        createdAtMs: now,
        completedAtMs: null,
        kind: 'reminder',
        recurrence: 'yearly',
      },
    ]);

    expect(stored[0].kind).toBe('reminder');
    expect(stored[0].recurrence).toBe('yearly');
  });

  it('reads everything written before reminders existed as a task', () => {
    const stored = sanitizeTasks([
      { id: 't1', title: 'antiga', createdAtMs: now, completedAtMs: null },
    ]);

    expect(stored[0].kind).toBe('task');
    expect(isOpen(stored[0])).toBe(true);
  });

  it('reads a reminder with no date as the task it looks like', () => {
    const stored = sanitizeTasks([
      {
        id: 'r2',
        title: 'sem data',
        createdAtMs: now,
        completedAtMs: null,
        kind: 'reminder',
        recurrence: 'monthly',
      },
    ]);

    expect(stored[0].kind).toBe('task');
  });

  it('falls back to a single occurrence when the recurrence is nonsense', () => {
    const stored = sanitizeTasks([
      {
        id: 'r3',
        title: 'aniversário',
        dueAtMs: atNoon(2026, 8, 12),
        createdAtMs: now,
        completedAtMs: null,
        kind: 'reminder',
        recurrence: 'fortnightly',
      },
    ]);

    expect(stored[0].recurrence).toBe('once');
  });
});

describe('what the phone is asked to hold', () => {
  it('asks for one alert per occurrence held ahead', () => {
    const workspace = reminder(atNoon(2026, 8, 12), 'monthly');

    expect(desiredReminderAlerts(workspace.tasks, now)).toHaveLength(3);
  });

  it('schedules them, keyed by the reminder and the occurrence', async () => {
    const workspace = reminder(atNoon(2026, 8, 12), 'yearly');
    const id = workspace.tasks[0].id;

    await syncReminderAlerts(workspace.tasks, now, 'pt-BR');

    expect(scheduled.size).toBe(3);
    expect(scheduled.get(`reminder-item.${id}.0`)?.notification.title).toBe(
      'aniversário da Ana',
    );
    expect(scheduled.get(`reminder-item.${id}.0`)?.notification.body).toBe(
      'Lembrete de hoje',
    );
  });

  it('writes the notification in the language the app is set to', async () => {
    const workspace = reminder(atNoon(2026, 8, 12), 'once');
    const id = workspace.tasks[0].id;

    await syncReminderAlerts(workspace.tasks, now, 'en-US');

    expect(scheduled.get(`reminder-item.${id}.0`)?.notification.body).toBe(
      "Today's reminder",
    );
  });

  it('moves the alerts when the date moves', async () => {
    const workspace = reminder(atNoon(2026, 8, 12), 'once');
    const id = workspace.tasks[0].id;

    await syncReminderAlerts(workspace.tasks, now, 'pt-BR');
    const before = scheduled.get(`reminder-item.${id}.0`)?.trigger.timestamp;

    const moved = editTask(
      workspace,
      id,
      { dueAtMs: atNoon(2026, 9, 4) },
      now,
    ).workspace;
    await syncReminderAlerts(moved.tasks, now, 'pt-BR');

    expect(scheduled.get(`reminder-item.${id}.0`)?.trigger.timestamp).not.toBe(
      before,
    );
    expect(scheduled.size).toBe(1);
  });

  it('cancels everything when the reminder is deleted', async () => {
    const workspace = reminder(atNoon(2026, 8, 12), 'monthly');
    const id = workspace.tasks[0].id;

    await syncReminderAlerts(workspace.tasks, now, 'pt-BR');
    expect(scheduled.size).toBe(3);

    const gone = deleteTask(workspace, id, now).workspace;
    await syncReminderAlerts(gone.tasks, now, 'pt-BR');

    expect(scheduled.size).toBe(0);
  });

  it('holds nothing for a task', async () => {
    counter = 0;
    const workspace = captureTask(
      EMPTY_WORKSPACE,
      'entregar relatório',
      { nowMs: now, createId },
      { dueAtMs: atNoon(2026, 8, 12) },
    ).workspace;

    await syncReminderAlerts(workspace.tasks as readonly Task[], now, 'pt-BR');

    expect(scheduled.size).toBe(0);
  });
});
