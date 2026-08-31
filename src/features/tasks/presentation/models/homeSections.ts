import { isOpen, type Task } from '../../domain/Task';
import type { TaskList } from '../../domain/TaskList';
import type { AppLanguage, TaskCopy } from '../localization/taskCopy';
import { deadlineSections, type DeadlineSection } from './deadlineSections';

export type HomeGrouping = 'deadline' | 'list' | 'priority';

interface SectionDraft extends DeadlineSection {
  order: number;
}

/**
 * Changes the lens of the home list without changing which tasks are shown.
 *
 * A person chooses one organizing principle at a time: when the lens is a
 * list, its headings are lists; when it is priority, its headings are the
 * three levels. Deadline keeps the chronological grouping it already owned.
 */
export function homeSections(
  tasks: readonly Task[],
  grouping: HomeGrouping,
  nowMs: number,
  language: AppLanguage,
  copy: TaskCopy,
  lists: readonly TaskList[],
): readonly DeadlineSection[] {
  if (grouping === 'deadline') {
    return deadlineSections(tasks, nowMs, language, copy);
  }

  const listById = new Map(
    lists.map((list, index) => [list.id, { list, index }]),
  );
  const sections = new Map<string, SectionDraft>();

  for (const task of tasks.filter(isOpen)) {
    const section =
      grouping === 'list'
        ? listSection(task, listById, copy)
        : prioritySection(task, copy);
    const existing = sections.get(section.id);

    if (existing == null) {
      sections.set(section.id, { ...section, tasks: [task] });
    } else {
      existing.tasks = [...existing.tasks, task];
    }
  }

  return [...sections.values()]
    .sort((first, second) => first.order - second.order)
    .map(({ order: _order, ...section }) => ({
      ...section,
      tasks: [...section.tasks].sort(compareTasks),
    }));
}

function listSection(
  task: Task,
  listById: ReadonlyMap<string, { list: TaskList; index: number }>,
  copy: TaskCopy,
): Omit<SectionDraft, 'tasks'> {
  const found = listById.get(task.listId);

  if (found == null) {
    return {
      id: `list-${task.listId}`,
      title: copy.capture.noList,
      order: Number.MAX_SAFE_INTEGER,
    };
  }

  return {
    id: `list-${found.list.id}`,
    title: found.list.name,
    order: found.index,
    project: { color: found.list.color, icon: found.list.icon },
  };
}

function prioritySection(
  task: Task,
  copy: TaskCopy,
): Omit<SectionDraft, 'tasks'> {
  const order =
    task.priority === 'high' ? 0 : task.priority === 'medium' ? 1 : 2;

  return {
    id: `priority-${task.priority}`,
    title: copy.priorityLabel[task.priority],
    order,
  };
}

function compareTasks(first: Task, second: Task): number {
  const priority = priorityWeight(second) - priorityWeight(first);

  return priority !== 0 ? priority : first.createdAtMs - second.createdAtMs;
}

function priorityWeight(task: Task): number {
  return task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
}
