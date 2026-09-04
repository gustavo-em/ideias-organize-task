import type { Unsubscribe } from '../../../../shared/events/EventBus';
import type { Haptics } from '../../application/ports/Haptics';
import type { TaskEventBus } from '../../domain/TaskEvent';

/**
 * What the phone does in your hand.
 *
 * Ticking a task off used to buzz. It is the action the app exists for and the
 * one people repeat all day, so the buzz stopped reading as feedback and
 * started reading as noise — the app answering back to something that already
 * answered for itself. It was removed.
 *
 * Two moments are left, both rare and both deliberate: the day closing, and a
 * project becoming shared. Anything more and the app becomes something people
 * silence.
 */
export function createFeedbackSubscriber(
  bus: TaskEventBus,
  haptics: Haptics,
): Unsubscribe {
  const unsubscribes = [
    bus.on('trio.completed', () => haptics.celebrate()),
    bus.on('list.shared', () => haptics.tap()),
  ];

  return () => unsubscribes.forEach(unsubscribe => unsubscribe());
}
