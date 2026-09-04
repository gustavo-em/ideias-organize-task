import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { TriggerType } from '@notifee/react-native';

import { captureTask } from '../src/features/tasks/application/useCases/captureTask';
import { deleteTask } from '../src/features/tasks/application/useCases/deleteTask';
import { editTask } from '../src/features/tasks/application/useCases/editTask';
import { toggleTask } from '../src/features/tasks/application/useCases/toggleTask';
import { endOfDay } from '../src/features/tasks/domain/Day';
import { REMINDER_HOUR } from '../src/features/tasks/domain/DeadlineReminder';
import { EMPTY_WORKSPACE } from '../src/features/tasks/domain/Workspace';
import { syncDeadlineReminders } from '../src/features/tasks/infrastructure/notifications/notifeeDeadlineScheduler';

const now = new Date(2026, 7, 30, 10, 0).getTime();
let counter = 0;
const createId = () => `id-${(counter += 1)}`;

// The mock keeps what the phone would be holding, so the assertions read the
// pending triggers rather than the calls that produced them.
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

function dueInDays(days: number): number {
  const due = new Date(now);
  due.setDate(due.getDate() + days);
  return endOfDay(due.getTime());
}

function withReminder(days: number, dueDays = 3) {
  counter = 0;
  return captureTask(
    EMPTY_WORKSPACE,
    'entregar relatório',
    { nowMs: now, createId },
    { dueAtMs: dueInDays(dueDays), remindDaysBefore: days },
  ).workspace;
}

beforeEach(async () => {
  scheduled.clear();
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('holding the reminders the tasks ask for', () => {
  it('schedules a timestamp trigger at nine in the morning of the chosen day', async () => {
    const workspace = withReminder(2);

    await syncDeadlineReminders(workspace.tasks, now, 'pt-BR');

    const entry = scheduled.get(`task-due.${workspace.tasks[0].id}`);

    expect(entry).toBeDefined();
    expect(entry?.trigger.type).toBe(TriggerType.TIMESTAMP);
    expect(new Date(entry?.trigger.timestamp as number).getHours()).toBe(
      REMINDER_HOUR,
    );
    expect(entry?.notification.title).toBe('entregar relatório');
    expect(entry?.notification.body).toBe('Vence em 2 dias');
  });

  it('writes the notification in the language the app is set to', async () => {
    const workspace = withReminder(1);

    await syncDeadlineReminders(workspace.tasks, now, 'en-US');

    expect(
      scheduled.get(`task-due.${workspace.tasks[0].id}`)?.notification.body,
    ).toBe('Due tomorrow');
  });

  it('moves the trigger when the deadline moves', async () => {
    const workspace = withReminder(2);
    const taskId = workspace.tasks[0].id;

    await syncDeadlineReminders(workspace.tasks, now, 'pt-BR');
    const before = scheduled.get(`task-due.${taskId}`)?.trigger.timestamp;

    const moved = editTask(
      workspace,
      taskId,
      { dueAtMs: dueInDays(6) },
      now,
    ).workspace;
    await syncDeadlineReminders(moved.tasks, now, 'pt-BR');

    expect(scheduled.get(`task-due.${taskId}`)?.trigger.timestamp).not.toBe(
      before,
    );
    expect(scheduled.size).toBe(1);
  });

  it('cancels the reminder when the task is finished', async () => {
    const workspace = withReminder(2);
    const taskId = workspace.tasks[0].id;

    await syncDeadlineReminders(workspace.tasks, now, 'pt-BR');
    const done = toggleTask(workspace, taskId, now).workspace;
    await syncDeadlineReminders(done.tasks, now, 'pt-BR');

    expect(scheduled.has(`task-due.${taskId}`)).toBe(false);
  });

  it('cancels the reminder when the task is deleted', async () => {
    const workspace = withReminder(2);
    const taskId = workspace.tasks[0].id;

    await syncDeadlineReminders(workspace.tasks, now, 'pt-BR');
    const gone = deleteTask(workspace, taskId, now).workspace;
    await syncDeadlineReminders(gone.tasks, now, 'pt-BR');

    expect(scheduled.size).toBe(0);
  });

  it('cancels the reminder when the person turns it off', async () => {
    const workspace = withReminder(2);
    const taskId = workspace.tasks[0].id;

    await syncDeadlineReminders(workspace.tasks, now, 'pt-BR');
    const off = editTask(
      workspace,
      taskId,
      { remindDaysBefore: null },
      now,
    ).workspace;
    await syncDeadlineReminders(off.tasks, now, 'pt-BR');

    expect(scheduled.size).toBe(0);
  });

  it('creates the channel before scheduling, on a phone that never showed one', async () => {
    const workspace = withReminder(2);

    await syncDeadlineReminders(workspace.tasks, now, 'pt-BR');

    expect(notifee.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'project-activity' }),
    );
    expect(
      (notifee.createChannel as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan(
      (notifee.createTriggerNotification as jest.Mock).mock
        .invocationCallOrder[0],
    );
  });

  it('catches up on a morning already past exactly once', async () => {
    // Set at ten in the evening for tomorrow: this morning is gone, so the
    // reminder goes off in a minute — and only that once, however many times
    // the app is opened before the deadline.
    const evening = new Date(2026, 7, 30, 22, 0).getTime();
    const workspace = withReminder(1, 1);
    const taskId = workspace.tasks[0].id;

    await syncDeadlineReminders(workspace.tasks, evening, 'pt-BR');
    expect(scheduled.has(`task-due.${taskId}`)).toBe(true);

    // It fired, so the phone is no longer holding it.
    scheduled.clear();
    await syncDeadlineReminders(
      workspace.tasks,
      evening + 5 * 60 * 1000,
      'pt-BR',
    );

    expect(scheduled.size).toBe(0);
  });

  it('stays quiet on the days after a catch-up, as the lead time shrinks', async () => {
    // Three days ahead, asked for at ten in the evening: it catches up tonight.
    // Tomorrow the same task is two days out, which is another morning already
    // behind us — and saying it again would be the same reminder, daily.
    const evening = new Date(2026, 7, 30, 22, 0).getTime();
    const workspace = withReminder(3, 3);

    await syncDeadlineReminders(workspace.tasks, evening, 'pt-BR');
    expect(scheduled.size).toBe(1);

    for (const daysLater of [1, 2]) {
      scheduled.clear();
      const later = new Date(2026, 7, 30 + daysLater, 22, 0).getTime();

      await syncDeadlineReminders(workspace.tasks, later, 'pt-BR');

      expect(scheduled.size).toBe(0);
    }
  });

  it('speaks again when the person changes the lead time after a catch-up', async () => {
    const evening = new Date(2026, 7, 30, 22, 0).getTime();
    const workspace = withReminder(3, 3);
    const taskId = workspace.tasks[0].id;

    await syncDeadlineReminders(workspace.tasks, evening, 'pt-BR');
    scheduled.clear();

    const changed = editTask(
      workspace,
      taskId,
      { remindDaysBefore: 2 },
      evening,
    ).workspace;
    await syncDeadlineReminders(changed.tasks, evening, 'pt-BR');

    expect(scheduled.has(`task-due.${taskId}`)).toBe(true);
  });

  it('holds nothing while notifications are refused, and never throws', async () => {
    const workspace = withReminder(2);

    (notifee.getNotificationSettings as jest.Mock).mockResolvedValueOnce({
      authorizationStatus: 0,
    });

    await expect(
      syncDeadlineReminders(workspace.tasks, now, 'pt-BR'),
    ).resolves.toBeUndefined();
    expect(scheduled.size).toBe(0);
  });
});
