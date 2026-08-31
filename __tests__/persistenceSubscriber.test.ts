import { createEventBus } from '../src/shared/events/EventBus';
import type { TaskEvent } from '../src/features/tasks/domain/TaskEvent';
import { EMPTY_WORKSPACE } from '../src/features/tasks/domain/Workspace';
import { createPersistenceSubscriber } from '../src/features/tasks/infrastructure/events/createPersistenceSubscriber';

function makeStores() {
  return {
    taskStore: { load: jest.fn(), save: jest.fn(async () => undefined) },
    listStore: { load: jest.fn(), save: jest.fn(async () => undefined) },
    progressStore: { load: jest.fn(), save: jest.fn(async () => undefined) },
    trioStore: { load: jest.fn(), save: jest.fn(async () => undefined) },
  };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('persistence subscriber', () => {
  it('writes once for a run of commits', () => {
    const bus = createEventBus<TaskEvent>();
    const stores = makeStores();

    createPersistenceSubscriber(bus, { ...stores, debounceMs: 400 });

    for (let index = 0; index < 3; index += 1) {
      bus.publish({
        type: 'workspace.committed',
        at: index,
        workspace: { ...EMPTY_WORKSPACE, tasks: [] },
      });
    }

    jest.advanceTimersByTime(400);

    expect(stores.taskStore.save).toHaveBeenCalledTimes(1);
  });

  it('writes only the parts that changed', () => {
    const bus = createEventBus<TaskEvent>();
    const stores = makeStores();
    const first = { ...EMPTY_WORKSPACE };

    createPersistenceSubscriber(bus, {
      ...stores,
      debounceMs: 10,
      restored: first,
    });

    bus.publish({
      type: 'workspace.committed',
      at: 1,
      workspace: { ...first, tasks: [] },
    });
    jest.advanceTimersByTime(10);

    expect(stores.taskStore.save).toHaveBeenCalledTimes(1);
    expect(stores.listStore.save).not.toHaveBeenCalled();
    expect(stores.progressStore.save).not.toHaveBeenCalled();
  });

  it('writes nothing for a workspace that is exactly what was restored', () => {
    const bus = createEventBus<TaskEvent>();
    const stores = makeStores();

    createPersistenceSubscriber(bus, {
      ...stores,
      debounceMs: 10,
      restored: EMPTY_WORKSPACE,
    });

    bus.publish({
      type: 'workspace.committed',
      at: 1,
      workspace: EMPTY_WORKSPACE,
    });
    jest.advanceTimersByTime(10);

    expect(stores.taskStore.save).not.toHaveBeenCalled();
  });

  it('flushes what was waiting when it is torn down', () => {
    const bus = createEventBus<TaskEvent>();
    const stores = makeStores();
    const stop = createPersistenceSubscriber(bus, {
      ...stores,
      debounceMs: 5000,
    });

    bus.publish({
      type: 'workspace.committed',
      at: 1,
      workspace: EMPTY_WORKSPACE,
    });
    stop();

    expect(stores.taskStore.save).toHaveBeenCalledTimes(1);
  });

  it('survives a store that refuses to write', async () => {
    const bus = createEventBus<TaskEvent>();
    const stores = makeStores();
    const onError = jest.fn();

    stores.taskStore.save.mockRejectedValueOnce(new Error('disk full'));
    createPersistenceSubscriber(bus, { ...stores, debounceMs: 1, onError });
    bus.publish({
      type: 'workspace.committed',
      at: 1,
      workspace: EMPTY_WORKSPACE,
    });
    jest.advanceTimersByTime(1);
    await Promise.resolve();

    expect(onError).toHaveBeenCalled();
  });
});
