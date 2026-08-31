import { createEventBus } from '../src/shared/events/EventBus';

type TestEvent =
  | { type: 'one'; at: number; value: number }
  | { type: 'two'; at: number };

describe('event bus', () => {
  it('delivers every event to every listener, in order', () => {
    const bus = createEventBus<TestEvent>();
    const seen: string[] = [];

    bus.subscribe(event => seen.push(`a:${event.type}`));
    bus.subscribe(event => seen.push(`b:${event.type}`));
    bus.publish({ type: 'one', at: 0, value: 1 });

    expect(seen).toEqual(['a:one', 'b:one']);
  });

  it('narrows an event for a listener that asked for one kind', () => {
    const bus = createEventBus<TestEvent>();
    const values: number[] = [];

    bus.on('one', event => values.push(event.value));
    bus.publish({ type: 'two', at: 0 });
    bus.publish({ type: 'one', at: 0, value: 7 });

    expect(values).toEqual([7]);
  });

  it('stops delivering once a listener unsubscribes', () => {
    const bus = createEventBus<TestEvent>();
    const listener = jest.fn();
    const unsubscribe = bus.subscribe(listener);

    unsubscribe();
    bus.publish({ type: 'two', at: 0 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps going when one listener throws', () => {
    const onListenerError = jest.fn();
    const bus = createEventBus<TestEvent>({ onListenerError });
    const after = jest.fn();

    bus.subscribe(() => {
      throw new Error('boom');
    });
    bus.subscribe(after);
    bus.publish({ type: 'two', at: 0 });

    expect(after).toHaveBeenCalledTimes(1);
    expect(onListenerError).toHaveBeenCalledWith(expect.any(Error), 'two');
  });

  it('is not disturbed by a listener that unsubscribes while publishing', () => {
    const bus = createEventBus<TestEvent>();
    const second = jest.fn();
    const unsubscribeFirst = bus.subscribe(() => unsubscribeFirst());

    bus.subscribe(second);
    bus.publish({ type: 'two', at: 0 });

    expect(second).toHaveBeenCalledTimes(1);
  });
});
