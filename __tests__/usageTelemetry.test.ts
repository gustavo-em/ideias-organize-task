import {
  getAnalytics,
  logEvent,
  logScreenView,
  setUserId,
} from '@react-native-firebase/analytics';

import type { UsageReporter } from '../src/features/tasks/application/ports/UsageReporter';
import { captureTask } from '../src/features/tasks/application/useCases/captureTask';
import type { TaskEvent } from '../src/features/tasks/domain/TaskEvent';
import { EMPTY_WORKSPACE } from '../src/features/tasks/domain/Workspace';
import { createUsageSubscriber } from '../src/features/tasks/infrastructure/events/createUsageSubscriber';
import { firebaseUsageReporter } from '../src/features/tasks/infrastructure/usage/firebaseUsageReporter';
import { createEventBus } from '../src/shared/events/EventBus';

const now = new Date(2026, 7, 25, 10, 0).getTime();

function makeReporter(): jest.Mocked<UsageReporter> {
  const stub = () => jest.fn(async () => undefined) as jest.Mock;

  return {
    identify: stub(),
    taskCaptured: stub(),
    taskCompleted: stub(),
    groupCreated: stub(),
    trioCompleted: stub(),
    focusStarted: stub(),
    focusFinished: stub(),
    screenOpened: stub(),
    listShared: stub(),
    listMemberJoined: stub(),
    onboardingFinished: stub(),
  } as unknown as jest.Mocked<UsageReporter>;
}

function makeBus() {
  const bus = createEventBus<TaskEvent>();
  const reporter = makeReporter();

  createUsageSubscriber(bus, reporter);

  return { bus, reporter };
}

beforeEach(() => jest.clearAllMocks());

describe('what the capture event says about the sheet it came from', () => {
  it('carries the screen that opened it, so a space is not read as a day', () => {
    const { bus, reporter } = makeBus();
    const { events } = captureTask(
      EMPTY_WORKSPACE,
      'levar o carro na revisão',
      { nowMs: now, createId: () => 'id-1', origin: 'group' },
    );

    events.forEach(event => bus.publish(event));

    expect(reporter.taskCaptured).toHaveBeenCalledWith(
      expect.objectContaining({ origin: 'group', kind: 'task' }),
    );
  });

  it('says nothing about where when nothing said', () => {
    const { bus, reporter } = makeBus();
    const { events } = captureTask(EMPTY_WORKSPACE, 'comprar pão', {
      nowMs: now,
      createId: () => 'id-1',
    });

    events.forEach(event => bus.publish(event));

    expect(reporter.taskCaptured).toHaveBeenCalledWith(
      expect.objectContaining({ origin: null }),
    );
  });

  it('separates a reminder from a task, and keeps how often it comes back', () => {
    const { bus, reporter } = makeBus();
    const { events } = captureTask(
      EMPTY_WORKSPACE,
      'aniversário da Bia',
      { nowMs: now, createId: () => 'id-1', origin: 'list' },
      {
        kind: 'reminder',
        dueAtMs: now + 86400000,
        recurrence: 'yearly',
      },
    );

    events.forEach(event => bus.publish(event));

    expect(reporter.taskCaptured).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'reminder', recurrence: 'yearly' }),
    );
  });

  it('never carries what was typed', () => {
    const { bus, reporter } = makeBus();
    const { events } = captureTask(EMPTY_WORKSPACE, 'ligar pro dr. Alves', {
      nowMs: now,
      createId: () => 'id-1',
      origin: 'today',
    });

    events.forEach(event => bus.publish(event));

    const [reported] = reporter.taskCaptured.mock.calls[0];

    expect(JSON.stringify(reported)).not.toContain('Alves');
  });
});

describe('the rest of what is worth knowing', () => {
  it('reports a group opened inside a space, dated or not', () => {
    const { bus, reporter } = makeBus();

    bus.publish({
      type: 'group.created',
      at: now,
      group: {
        id: 'g-1',
        listId: 'l-1',
        name: 'Casamento',
        icon: 'cake',
        color: 'grape',
        eventAtMs: now + 86400000,
        createdAtMs: now,
      },
    });

    expect(reporter.groupCreated).toHaveBeenCalledWith({
      icon: 'cake',
      hasEventDate: true,
    });
  });

  it('reports a focus timer that starts, not only one that ends', () => {
    const { bus, reporter } = makeBus();

    bus.publish({
      type: 'focus.started',
      at: now,
      taskId: 't-1',
      plannedMs: 25 * 60000,
    });

    expect(reporter.focusStarted).toHaveBeenCalledWith({ plannedMinutes: 25 });
  });

  it('counts the people on a list when somebody accepts an invite', () => {
    const { bus, reporter } = makeBus();
    const member = {
      personId: 'p-2',
      name: 'Bia',
      handle: null,
      joined: true,
      joinedAtMs: now,
      role: 'editor' as const,
    };

    bus.publish({
      type: 'list.member.joined',
      at: now,
      list: {
        id: 'l-1',
        name: 'Casa',
        color: 'grape',
        icon: 'home',
        share: {
          token: 'tok',
          invitedAs: 'editor',
          members: [
            {
              ...member,
              personId: 'p-1',
              name: 'Gustavo',
              role: 'owner' as const,
            },
            member,
          ],
        },
      },
      member,
    });

    expect(reporter.listMemberJoined).toHaveBeenCalledWith({ memberCount: 2 });
  });
});

describe('what reaches Firebase Analytics', () => {
  it('sends the capture with booleans as numbers a report can average', async () => {
    await firebaseUsageReporter.taskCaptured({
      priority: 'high',
      hasDueDate: true,
      hasList: false,
      kind: 'task',
      recurrence: null,
      hasGroup: false,
      remindDaysBefore: null,
      subtaskCount: 2,
      origin: 'today',
      tookSeconds: 4.2,
    });

    expect(logEvent).toHaveBeenCalledWith(getAnalytics(), 'task_captured', {
      priority: 'high',
      kind: 'task',
      origin: 'today',
      has_due_date: 1,
      has_list: 0,
      has_group: 0,
      subtask_count: 2,
      took_seconds: 4.2,
    });
  });

  it('uses the reserved screen event, so the console draws its own reports', async () => {
    await firebaseUsageReporter.screenOpened('lists');

    expect(logScreenView).toHaveBeenCalledWith(getAnalytics(), {
      screen_name: 'lists',
      screen_class: 'lists',
    });
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('drops the account on sign-out rather than leaving the last one behind', async () => {
    await firebaseUsageReporter.identify(null);

    expect(setUserId).toHaveBeenCalledWith(getAnalytics(), null);
  });
});
