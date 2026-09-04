import type { TaskEventBus } from '../../../features/tasks/domain/TaskEvent';
import type { Unsubscribe } from '../../../shared/events/EventBus';
import type { CrashReporter } from '../../application/ports/CrashReporter';

/**
 * The trail a crash report is read against.
 *
 * Only the name of what happened is written down — never the event itself. A
 * `task.captured` carries the title somebody typed, and a breadcrumb that
 * leaked it would put private text in a crash report forever. The names alone
 * already answer the question a report leaves open: what was going on.
 *
 * `workspace.committed` is left out. It follows almost every other event, so
 * writing it down would push the interesting steps out of the trail.
 */
export function createBreadcrumbSubscriber(
  bus: TaskEventBus,
  reporter: CrashReporter,
): Unsubscribe {
  return bus.subscribe(event => {
    if (event.type === 'workspace.committed') return;

    reporter.log(event.type);
  });
}
