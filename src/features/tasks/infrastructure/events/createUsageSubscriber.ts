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
          kind: event.task.kind ?? 'task',
          recurrence: event.task.recurrence ?? null,
          hasGroup: event.task.groupId != null,
          remindDaysBefore: event.task.remindDaysBefore ?? null,
          subtaskCount: event.task.subtasks.length,
          origin: event.origin,
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
    bus.on('group.created', event => {
      reporter
        .groupCreated({
          icon: event.group.icon,
          hasEventDate: event.group.eventAtMs != null,
        })
        .catch(ignore);
    }),
    bus.on('trio.completed', event => {
      reporter.trioCompleted({ streakDays: event.streakDays }).catch(ignore);
    }),
    bus.on('focus.started', event => {
      reporter
        .focusStarted({ plannedMinutes: Math.round(event.plannedMs / 60000) })
        .catch(ignore);
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
    bus.on('list.shared', () => {
      reporter.listShared().catch(ignore);
    }),
    bus.on('list.member.joined', event => {
      reporter
        .listMemberJoined({
          memberCount: event.list.share?.members.length ?? 0,
        })
        .catch(ignore);
    }),
  ];

  return () => unsubscribes.forEach(unsubscribe => unsubscribe());
}
