import { act, create } from 'react-test-renderer';

import type { ReviewInvitationStore } from '../src/app/application/ports/ReviewInvitationStore';
import type { ReviewInvitationState } from '../src/app/domain/ReviewInvitation';
import { useReviewInvitation } from '../src/app/session/useReviewInvitation';
import type { Task } from '../src/features/tasks/domain/Task';
import type { TaskEvent } from '../src/features/tasks/domain/TaskEvent';
import { createEventBus } from '../src/shared/events/EventBus';

const NOW = 1_700_000_000_000;

function makeStore(stored: ReviewInvitationState | null = null) {
  const saved: ReviewInvitationState[] = [];
  const store: ReviewInvitationStore = {
    load: async () => stored,
    save: async state => {
      saved.push(state);
    },
  };

  return { store, saved };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't-1',
    title: 'levar o carro',
    listId: 'inbox',
    priority: 'medium',
    dueAtMs: null,
    remindDaysBefore: null,
    estimatedMinutes: null,
    groupId: null,
    createdAtMs: NOW,
    completedAtMs: NOW,
    subtasks: [],
    kind: 'task',
    ...overrides,
  };
}

function completed(id: string, kind: 'task' | 'reminder' = 'task'): TaskEvent {
  return {
    type: 'task.completed',
    at: NOW,
    task: task({ id, kind }),
    weight: 1,
    inTrio: false,
  };
}

type Invitation = ReturnType<typeof useReviewInvitation>;

async function mount(stored: ReviewInvitationState | null = null) {
  const bus = createEventBus<TaskEvent>();
  const { store, saved } = makeStore(stored);
  let latest: Invitation | null = null;

  function Probe() {
    latest = useReviewInvitation(bus, store);
    return null;
  }

  await act(async () => {
    create(<Probe />);
  });

  return {
    bus,
    saved,
    close: async (id: string, kind: 'task' | 'reminder' = 'task') => {
      await act(async () => {
        bus.publish(completed(id, kind));
      });
    },
    get current() {
      return latest as Invitation;
    },
  };
}

describe('asking for a rating after three tasks', () => {
  it('stays quiet for the first two and asks on the third', async () => {
    const app = await mount();

    await app.close('t-1');
    await app.close('t-2');
    expect(app.current.isInviting).toBe(false);

    await app.close('t-3');
    expect(app.current.isInviting).toBe(true);
  });

  it('does not count a reminder, which is not work finished', async () => {
    const app = await mount();

    await app.close('r-1', 'reminder');
    await app.close('r-2', 'reminder');
    await app.close('r-3', 'reminder');

    expect(app.current.isInviting).toBe(false);
  });

  it('writes down that it asked, so a cold start does not ask again', async () => {
    const app = await mount();

    await app.close('t-1');
    await app.close('t-2');
    await app.close('t-3');

    expect(app.saved[app.saved.length - 1].lastAskedAtMs).toBe(NOW);
  });

  it('never asks somebody who said not to ask again', async () => {
    const app = await mount({
      completed: 12,
      lastAskedAtMs: 0,
      hasRated: false,
      hasDeclined: true,
    });

    await app.close('t-1');

    expect(app.current.isInviting).toBe(false);
  });

  it('records the rating so the question is over for good', async () => {
    const app = await mount();

    await app.close('t-1');
    await app.close('t-2');
    await app.close('t-3');

    await act(async () => {
      app.current.accept();
    });

    expect(app.saved[app.saved.length - 1].hasRated).toBe(true);
  });
});
