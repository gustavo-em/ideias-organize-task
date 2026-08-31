/**
 * A minimal publish/subscribe bus.
 *
 * It is deliberately generic: the bus knows that an event has a `type` and
 * nothing else about the product. The concrete event union lives with the
 * feature that emits it, so this file never has to change when a new event is
 * introduced.
 */

export interface DomainEventShape {
  readonly type: string;
  /** When the event happened, in epoch milliseconds. */
  readonly at: number;
}

export type EventListener<Event> = (event: Event) => void;

export type Unsubscribe = () => void;

export interface EventBus<Event extends DomainEventShape> {
  publish(event: Event): void;
  /** Called for every event, in registration order. */
  subscribe(listener: EventListener<Event>): Unsubscribe;
  /** Called only for one kind of event, already narrowed for the listener. */
  on<Type extends Event['type']>(
    type: Type,
    listener: EventListener<Extract<Event, { type: Type }>>,
  ): Unsubscribe;
}

interface EventBusOptions {
  /** Where a listener that threw is reported. A listener must never be able to
   * stop the ones registered after it: a broken analytics call would otherwise
   * take the animation and the save down with it. */
  onListenerError?: (error: unknown, type: string) => void;
}

export function createEventBus<Event extends DomainEventShape>(
  options: EventBusOptions = {},
): EventBus<Event> {
  const listeners = new Set<EventListener<Event>>();

  function add(listener: EventListener<Event>): Unsubscribe {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    publish(event) {
      // The set is copied first so a listener that unsubscribes itself, or
      // registers another one, does not change what this publish delivers.
      for (const listener of [...listeners]) {
        try {
          listener(event);
        } catch (error) {
          options.onListenerError?.(error, event.type);
        }
      }
    },
    subscribe: add,
    on(type, listener) {
      return add(event => {
        if (event.type === type) {
          listener(event as Extract<Event, { type: typeof type }>);
        }
      });
    },
  };
}
