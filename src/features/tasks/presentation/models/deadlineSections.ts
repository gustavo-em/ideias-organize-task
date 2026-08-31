import { daysBetween, startOfDay } from '../../domain/Day';
import { isOpen, type Task } from '../../domain/Task';
import type { ListColor, ProjectIcon } from '../../domain/TaskList';
import type { AppLanguage, TaskCopy } from '../localization/taskCopy';
import { formatDayLabel } from './dateLabel';

export interface DeadlineSection {
  id: string;
  title: string;
  tasks: readonly Task[];
  project?: { color: ListColor; icon: ProjectIcon };
}

interface SectionDraft extends DeadlineSection {
  order: number;
}

/**
 * The Today tab is a deadline lens, not a daily commitment. A deadline gets
 * its own day heading; overdue work stays together so the past does not take
 * over the whole screen, and undated ideas remain visible at the end.
 */
export function deadlineSections(
  tasks: readonly Task[],
  nowMs: number,
  language: AppLanguage,
  copy: TaskCopy,
): readonly DeadlineSection[] {
  const today = startOfDay(nowMs);
  const sections = new Map<string, SectionDraft>();

  for (const task of tasks.filter(isOpen)) {
    const section = sectionFor(task, today, nowMs, language, copy);
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

function sectionFor(
  task: Task,
  todayMs: number,
  nowMs: number,
  language: AppLanguage,
  copy: TaskCopy,
): Omit<SectionDraft, 'tasks'> {
  if (task.dueAtMs == null) {
    return {
      id: 'undated',
      title: copy.today.sectionNoDate,
      order: Number.MAX_SAFE_INTEGER,
    };
  }

  const dueDay = startOfDay(task.dueAtMs);

  if (dueDay < todayMs) {
    return { id: 'overdue', title: copy.today.sectionOverdue, order: -1 };
  }

  if (dueDay === todayMs) {
    return { id: 'today', title: copy.today.sectionToday, order: 0 };
  }

  if (daysBetween(nowMs, task.dueAtMs) === 1) {
    return { id: 'tomorrow', title: copy.today.sectionTomorrow, order: 1 };
  }

  return {
    id: `day-${dueDay}`,
    title: formatDayLabel(task.dueAtMs, language),
    order: dueDay,
  };
}

function compareTasks(first: Task, second: Task): number {
  const priority = priorityWeight(second) - priorityWeight(first);

  return priority !== 0 ? priority : first.createdAtMs - second.createdAtMs;
}

function priorityWeight(task: Task): number {
  return task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
}
