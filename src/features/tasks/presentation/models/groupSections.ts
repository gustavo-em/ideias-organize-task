import { isCompleted, type Task } from '../../domain/Task';
import {
  groupBucketOf,
  groupTasks,
  type GroupBucket,
  type TaskGroup,
} from '../../domain/TaskGroup';
import type { TaskCopy } from '../localization/taskCopy';

export interface GroupSection {
  id: GroupBucket | 'open';
  title: string;
  tasks: readonly Task[];
}

/**
 * How an open group reads from top to bottom.
 *
 * A dated group is grouped by how close the event is — this week, on the day,
 * later — because that is the only question a birthday raises: what still has
 * to happen before Saturday. A group with no date has no proximity to sort by,
 * so it falls back to the plain split every list makes: open work, then what
 * is finished.
 *
 * Empty sections are dropped rather than shown as headings with nothing under
 * them: a rule over air says the app lost something.
 */
export function groupSections(
  group: TaskGroup,
  tasks: readonly Task[],
  nowMs: number,
  copy: TaskCopy,
): readonly GroupSection[] {
  const own = groupTasks(tasks, group.id);
  const words = copy.lists.groups;

  if (group.eventAtMs == null) {
    const open = own.filter(task => !isCompleted(task));
    const done = own.filter(isCompleted);

    return [
      { id: 'open' as const, title: words.sectionOpen, tasks: open },
      { id: 'done' as const, title: words.sectionDone, tasks: done },
    ].filter(section => section.tasks.length > 0);
  }

  const buckets = new Map<GroupBucket, Task[]>();

  for (const task of own) {
    const bucket = groupBucketOf(task, group, nowMs);
    const current = buckets.get(bucket);

    if (current == null) buckets.set(bucket, [task]);
    else current.push(task);
  }

  const order: readonly { id: GroupBucket; title: string }[] = [
    { id: 'week', title: words.sectionWeek },
    { id: 'day', title: words.sectionDay },
    { id: 'later', title: words.sectionLater },
    { id: 'done', title: words.sectionDone },
  ];

  return order
    .map(section => ({ ...section, tasks: buckets.get(section.id) ?? [] }))
    .filter(section => section.tasks.length > 0);
}

/** What the block says under the name: the day of the event and how far away
 * it still is, or that there is none. */
export function groupDateLine(
  group: TaskGroup,
  nowMs: number,
  copy: TaskCopy,
  formatDate: (atMs: number) => string,
  daysUntil: number | null,
): string {
  const words = copy.lists.groups;

  if (group.eventAtMs == null || daysUntil == null) return words.noDate;

  const distance =
    daysUntil === 0
      ? words.eventToday
      : daysUntil === 1
      ? words.eventTomorrow
      : daysUntil > 1
      ? words.eventInDays(daysUntil)
      : words.eventPastDays(-daysUntil);

  return `${formatDate(group.eventAtMs)} · ${distance}`;
}
