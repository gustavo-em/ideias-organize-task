import type { Unsubscribe } from '../../../../shared/events/EventBus';
import type { UsageReporter } from '../../application/ports/UsageReporter';
import type { TaskEventBus } from '../../domain/TaskEvent';

/** A rejected report is not worth a crash, and never worth a retry loop. */
function ignore(): void {}

/**
 * Telemetry, translated from facts.
 *
 * The reporter only ever hears about the shape of what happened. Titles, list
 * names and typed text stay on the device: none of them are needed to know
 * whether capture is working.
 */
export function createUsageSubscriber(
  bus: TaskEventBus,
  reporter: UsageReporter,
): Unsubscribe {
  const unsubscribes = [
    bus.on('task.captured', event => {
      reporter
        .taskCaptured({
          priority: event.task.priority,
          hasDueDate: event.task.dueAtMs != null,
          hasList: event.task.listId !== 'inbox',
          tookSeconds:
            event.tookMs == null ? null : Math.round(event.tookMs / 100) / 10,
        })
        .catch(ignore);
    }),
    bus.on('task.completed', event => {
      reporter
        .taskCompleted({ weight: event.weight, inTrio: event.inTrio })
        .catch(ignore);
    }),
    bus.on('trio.completed', event => {
      reporter.trioCompleted({ streakDays: event.streakDays }).catch(ignore);
    }),
    bus.on('focus.finished', event => {
      reporter
        .focusFinished({
          minutes: Math.round(event.elapsedMs / 60000),
          reachedEnd: event.reachedEnd,
        })
        .catch(ignore);
    }),
    bus.on('screen.opened', event => {
      reporter.screenOpened(event.screen).catch(ignore);
    }),
  ];

  return () => unsubscribes.forEach(unsubscribe => unsubscribe());
}
