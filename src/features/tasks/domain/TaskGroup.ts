import { daysBetween, endOfDay, startOfDay } from './Day';
import { isCompleted, isOpen, isReminder, type Task } from './Task';
import {
  listColors,
  normalizeListName,
  projectIcons,
  stripAccents,
  type ListColor,
  type ProjectIcon,
} from './ProjectIdentity';

/**
 * A reason inside a space.
 *
 * A space holds two things: loose tasks and groups. The difference is one of
 * form, not of label — a task is a line, a group is a tinted block. What earns
 * a group that weight is that it carries an identity of its own: an icon, a
 * name, a colour, and optionally the date of the thing it is about. The date
 * is what makes a birthday group work by itself; without one the group is
 * simply an open project.
 *
 * Two layers is the limit. A group never holds another group: three layers
 * turn the list into a folder tree and the space stops being readable.
 */
export interface TaskGroup {
  id: string;
  /** Which space it lives in. Kept on the group as well as by containment so
   * a group read on its own still knows where it belongs. */
  listId: string;
  name: string;
  /** Never optional: the icon is a field, not an ornament. A group with no
   * icon reads as a task that grew a background. */
  icon: ProjectIcon;
  color: ListColor;
  /** The day the event happens, or null for a group that is an open project.
   * Stored as the last millisecond of that day, the same convention a task's
   * deadline uses: "on the 18th" is not past until the 18th is over. */
  eventAtMs: number | null;
  createdAtMs: number;
}

/** Longest name kept, matching what a space allows. */
const MAX_GROUP_NAME_LENGTH = 60;

/** How far out a group still counts as "this week" when it has a date. */
export const GROUP_WEEK_DAYS = 7;

export function cleanGroupName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_GROUP_NAME_LENGTH);
}

/**
 * The icon the sheet opens on, guessed from what is being typed.
 *
 * The icon is required, so leaving the field empty would put a wall in front
 * of a person who only wanted to name a birthday. The guess is a suggestion
 * with a tap to change it — never a decision — and a name that matches nothing
 * still gets the neutral one rather than nothing at all.
 */
const ICON_HINTS: readonly { icon: ProjectIcon; words: readonly string[] }[] = [
  {
    icon: 'cake',
    words: ['aniversario', 'birthday', 'festa', 'party', 'bolo'],
  },
  {
    icon: 'gift',
    words: ['presente', 'gift', 'natal', 'christmas', 'amigo oculto'],
  },
  {
    icon: 'tools',
    words: ['reforma', 'obra', 'conserto', 'renovation', 'repair', 'fix'],
  },
  { icon: 'plane', words: ['viagem', 'ferias', 'trip', 'travel', 'vacation'] },
  {
    icon: 'heart',
    words: ['casamento', 'wedding', 'namoro', 'aniversario de'],
  },
  { icon: 'home', words: ['casa', 'mudanca', 'home', 'moving', 'apartamento'] },
  { icon: 'cart', words: ['compras', 'mercado', 'shopping', 'grocery'] },
  { icon: 'wallet', words: ['conta', 'orcamento', 'budget', 'financ'] },
  { icon: 'book', words: ['estudo', 'curso', 'study', 'course', 'prova'] },
  { icon: 'dumbbell', words: ['treino', 'academia', 'gym', 'workout'] },
  { icon: 'briefcase', words: ['trabalho', 'work', 'cliente', 'client'] },
  { icon: 'calendar', words: ['evento', 'event', 'reuniao', 'meeting'] },
];

export function guessGroupIcon(name: string): ProjectIcon {
  const wanted = stripAccents(name.trim().toLowerCase());
  if (wanted.length === 0) return DEFAULT_GROUP_ICON;

  for (const hint of ICON_HINTS) {
    if (hint.words.some(word => wanted.includes(word))) return hint.icon;
  }

  return DEFAULT_GROUP_ICON;
}

export const DEFAULT_GROUP_ICON: ProjectIcon = 'layers';

export function createTaskGroupEntity(
  id: string,
  listId: string,
  name: string,
  appearance: { color: ListColor; icon: ProjectIcon },
  eventAtMs: number | null,
  createdAtMs: number,
): TaskGroup {
  return {
    id,
    listId,
    name: cleanGroupName(name),
    icon: appearance.icon,
    color: appearance.color,
    eventAtMs: eventAtMs == null ? null : endOfDay(eventAtMs),
    createdAtMs,
  };
}

export function findGroupById(
  groups: readonly TaskGroup[],
  id: string | null | undefined,
): TaskGroup | null {
  if (id == null) return null;

  return groups.find(group => group.id === id) ?? null;
}

/** Two groups in the same space cannot answer to the same name: the block is
 * read by its name, and two identical blocks are two guesses. */
export function findGroupByName(
  groups: readonly TaskGroup[],
  name: string,
): TaskGroup | null {
  const wanted = normalizeListName(name);

  return groups.find(group => normalizeListName(group.name) === wanted) ?? null;
}

/** The work inside a group. Reminders live in the space, never in a group:
 * memory has nothing to finish and would sit in the bar as work that never
 * closes. */
export function groupTasks(
  tasks: readonly Task[],
  groupId: string,
): readonly Task[] {
  return tasks.filter(task => task.groupId === groupId && !isReminder(task));
}

/** What the bar measures: the set of tasks, never the people. */
export function groupProgress(
  tasks: readonly Task[],
  groupId: string,
): { done: number; total: number } {
  const own = groupTasks(tasks, groupId);

  return { done: own.filter(isCompleted).length, total: own.length };
}

/** A group whose last task is closed. Reported as a fact, never as a reason
 * to hide it: the block says "tudo pronto" where the bar was. */
export function isGroupComplete(
  tasks: readonly Task[],
  groupId: string,
): boolean {
  const { done, total } = groupProgress(tasks, groupId);

  return total > 0 && done === total;
}

/** Whole days from today to the event, negative once it is past. Null for a
 * group with no date, which is the one that has nothing to count. */
export function daysUntilEvent(group: TaskGroup, nowMs: number): number | null {
  return group.eventAtMs == null ? null : daysBetween(nowMs, group.eventAtMs);
}

/**
 * The order the section reads in: dated groups first, by how close the event
 * is, then the undated ones by age.
 *
 * A birthday twelve days out has to be above a renovation with no end in
 * sight, and two groups with no date at all keep the order they were made in
 * rather than shuffling on every render.
 */
export function sortedGroups(
  groups: readonly TaskGroup[],
): readonly TaskGroup[] {
  return [...groups].sort((first, second) => {
    if (first.eventAtMs != null && second.eventAtMs != null) {
      return first.eventAtMs - second.eventAtMs;
    }
    if (first.eventAtMs != null) return -1;
    if (second.eventAtMs != null) return 1;

    return first.createdAtMs - second.createdAtMs;
  });
}

/** Where one task sits inside its group, once the group has a date: the day
 * of the event, the week leading to it, or after. Late work is pulled into
 * the week — it is the thing most in need of being seen. */
export type GroupBucket = 'week' | 'day' | 'later' | 'done';

export function groupBucketOf(
  task: Task,
  group: TaskGroup,
  nowMs: number,
): GroupBucket {
  if (isCompleted(task)) return 'done';
  if (group.eventAtMs == null || task.dueAtMs == null) {
    return group.eventAtMs == null ? 'week' : 'later';
  }

  if (startOfDay(task.dueAtMs) === startOfDay(group.eventAtMs)) return 'day';

  const days = daysBetween(nowMs, task.dueAtMs);

  return days <= GROUP_WEEK_DAYS ? 'week' : 'later';
}

/**
 * Whether a task sits loose on its space's floor.
 *
 * No group, or a group the space no longer has. The second half is what keeps
 * a task from vanishing: the space draws its groups as blocks and its loose
 * work as lines, so a task pointing at a block nobody can open would be in
 * neither place and would simply be gone from the only screen that holds it.
 */
export function isLooseInSpace(
  task: Task,
  groups: readonly TaskGroup[],
): boolean {
  return (
    task.groupId == null || !groups.some(group => group.id === task.groupId)
  );
}

/** Only open work counts as open, the same rule the rest of the app keeps. */
export function openGroupCount(
  tasks: readonly Task[],
  groupId: string,
): number {
  return groupTasks(tasks, groupId).filter(isOpen).length;
}

function sanitizeEventAtMs(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;
}

/**
 * Groups come off the device's disk and off the network, so they are read as
 * untrusted input: an entry without a name is dropped rather than allowed to
 * paint an unreadable block, and an icon nobody recognizes falls back to the
 * neutral one instead of leaving the square empty.
 */
export function sanitizeGroups(value: unknown, listId: string): TaskGroup[] {
  if (!Array.isArray(value)) return [];

  const groups: TaskGroup[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;

    const candidate = entry as Partial<Record<keyof TaskGroup, unknown>>;
    const id = typeof candidate.id === 'string' ? candidate.id : null;
    const name =
      typeof candidate.name === 'string' ? cleanGroupName(candidate.name) : '';

    if (id == null || name.length === 0 || seen.has(id)) continue;

    seen.add(id);
    groups.push({
      id,
      listId,
      name,
      icon: projectIcons.includes(candidate.icon as ProjectIcon)
        ? (candidate.icon as ProjectIcon)
        : DEFAULT_GROUP_ICON,
      color: listColors.includes(candidate.color as ListColor)
        ? (candidate.color as ListColor)
        : 'coral',
      eventAtMs: sanitizeEventAtMs(candidate.eventAtMs),
      createdAtMs:
        typeof candidate.createdAtMs === 'number' &&
        Number.isFinite(candidate.createdAtMs)
          ? candidate.createdAtMs
          : 0,
    });
  }

  return groups;
}
