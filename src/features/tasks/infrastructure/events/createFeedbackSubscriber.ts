import type { Unsubscribe } from '../../../../shared/events/EventBus';
import type { Haptics } from '../../application/ports/Haptics';
import type { TaskEventBus } from '../../domain/TaskEvent';

/**
 * What the phone does in your hand.
 *
 * Two moments only: a tick for one task, a short pattern for the day closing.
 * Anything more and the app becomes something people silence.
 */
export function createFeedbackSubscriber(
  bus: TaskEventBus,
  haptics: Haptics,
): Unsubscribe {
  const unsubscribes = [
    bus.on('task.completed', () => haptics.tap()),
    bus.on('trio.completed', () => haptics.celebrate()),
    bus.on('list.shared', () => haptics.tap()),
  ];

  return () => unsubscribes.forEach(unsubscribe => unsubscribe());
}
