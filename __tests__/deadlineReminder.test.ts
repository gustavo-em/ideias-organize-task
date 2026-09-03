import {
  clampRemindDays,
  desiredReminders,
  LATE_REMINDER_DELAY_MS,
  REMINDER_HOUR,
  reminderDayOptions,
  reminderTriggerAtMs,
} from '../src/features/tasks/domain/DeadlineReminder';
import { endOfDay } from '../src/features/tasks/domain/Day';
import type { Task } from '../src/features/tasks/domain/Task';

const now = new Date(2026, 7, 30, 10, 0).getTime();

function dueInDays(days: number): number {
  const due = new Date(now);
  due.setDate(due.getDate() + days);
  return endOfDay(due.getTime());
}

function taskWith(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'entregar relatório',
    listId: 'inbox',
    priority: 'medium',
    dueAtMs: dueInDays(3),
    estimatedMinutes: null,
    remindDaysBefore: 2,
    createdAtMs: now,
    completedAtMs: null,
    subtasks: [],
    ...overrides,
  };
}

describe('what a deadline can be announced with', () => {
  it('offers only the days that fit between today and the deadline', () => {
    expect(reminderDayOptions(dueInDays(3), now)).toEqual([1, 2, 3]);
    expect(reminderDayOptions(dueInDays(2), now)).toEqual([1, 2]);
  });

  it('stops at a week, so a distant deadline does not offer a month of noise', () => {
    expect(reminderDayOptions(dueInDays(40), now)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('offers nothing for a deadline today, one already past, or none at all', () => {
    expect(reminderDayOptions(dueInDays(0), now)).toEqual([]);
    expect(reminderDayOptions(dueInDays(-2), now)).toEqual([]);
    expect(reminderDayOptions(null, now)).toEqual([]);
  });
});

describe('a reminder against a deadline that moved', () => {
  it('shrinks to the largest lead time the new date still holds', () => {
    expect(clampRemindDays(dueInDays(2), 5, now)).toBe(2);
  });

  it('is dropped when the date leaves no room at all', () => {
    expect(clampRemindDays(dueInDays(0), 3, now)).toBeNull();
    expect(clampRemindDays(null, 3, now)).toBeNull();
  });

  it('stays null when nobody asked for one', () => {
    expect(clampRemindDays(dueInDays(4), null, now)).toBeNull();
  });
});

describe('when the phone speaks', () => {
  it('lands at nine in the morning of the chosen day, never at midnight', () => {
    const atMs = reminderTriggerAtMs(dueInDays(3), 2, now);
    const at = new Date(atMs as number);

    expect(at.getHours()).toBe(REMINDER_HOUR);
    expect(at.getMinutes()).toBe(0);
    expect(at.getDate()).toBe(new Date(dueInDays(1)).getDate());
  });

  it('falls back to a minute from now when that morning has already passed', () => {
    // Set late in the evening for tomorrow: nine this morning is gone, and the
    // reminder is still worth having.
    const evening = new Date(2026, 7, 30, 22, 0).getTime();
    const due = endOfDay(new Date(2026, 7, 31, 12, 0).getTime());

    expect(reminderTriggerAtMs(due, 1, evening)).toBe(
      evening + LATE_REMINDER_DELAY_MS,
    );
  });

  it('says nothing once the deadline itself has gone', () => {
    expect(reminderTriggerAtMs(dueInDays(-1), 1, now)).toBeNull();
  });
});

describe('the reminders a workspace asks for', () => {
  it('keeps one per open task with a date and a lead time', () => {
    const reminders = desiredReminders([taskWith()], now);

    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ taskId: 'task-1', daysBefore: 2 });
  });

  it('drops the finished, the dateless and the unasked', () => {
    const tasks = [
      taskWith({ id: 'done', completedAtMs: now }),
      taskWith({ id: 'no-date', dueAtMs: null }),
      taskWith({ id: 'no-reminder', remindDaysBefore: null }),
    ];

    expect(desiredReminders(tasks, now)).toEqual([]);
  });

  it('reports the shrunken lead time when the deadline was pulled closer', () => {
    const reminders = desiredReminders(
      [taskWith({ dueAtMs: dueInDays(1), remindDaysBefore: 5 })],
      now,
    );

    expect(reminders[0].daysBefore).toBe(1);
  });
});
