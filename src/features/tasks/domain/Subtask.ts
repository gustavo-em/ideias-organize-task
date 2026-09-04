/**
 * A step inside a task.
 *
 * One level, on purpose: a step that needs steps of its own is a task, and the
 * app already has those. Nothing here carries a date, a priority or a weight —
 * the score belongs to the task, so slicing work into ten lines can never buy
 * a single point.
 */
export interface Subtask {
  id: string;
  title: string;
  completedAtMs: number | null;
  /** True when the parent task closing is what closed this one, so reopening
   * the parent can put back exactly what it took down and nothing else. */
  closedWithParent: boolean;
  createdAtMs: number;
}

/** Past this the list stops being a task and starts being a project. */
export const MAX_SUBTASKS = 20;

/** Shorter than a task title: a step is a line, not a paragraph. */
export const MAX_SUBTASK_TITLE = 100;

export function normalizeSubtaskTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_SUBTASK_TITLE);
}

export function isSubtaskDone(subtask: Subtask): boolean {
  return subtask.completedAtMs != null;
}

export function countDoneSubtasks(subtasks: readonly Subtask[]): number {
  return subtasks.filter(isSubtaskDone).length;
}

/**
 * Adds one step to the end of the list.
 *
 * Returns the same array when there is nothing to add or no room left, so the
 * caller can treat "no change" as a no-op instead of a save.
 */
export function addSubtask(
  subtasks: readonly Subtask[],
  title: string,
  atMs: number,
  id: string,
): readonly Subtask[] {
  const clean = normalizeSubtaskTitle(title);

  if (clean.length === 0 || subtasks.length >= MAX_SUBTASKS) return subtasks;

  return [
    ...subtasks,
    {
      id,
      title: clean,
      completedAtMs: null,
      closedWithParent: false,
      createdAtMs: atMs,
    },
  ];
}

/** A title erased to nothing is a slip, not an instruction: the old one stays. */
export function renameSubtask(
  subtasks: readonly Subtask[],
  subtaskId: string,
  title: string,
): readonly Subtask[] {
  const clean = normalizeSubtaskTitle(title);

  if (clean.length === 0) return subtasks;

  let changed = false;
  const next = subtasks.map(subtask => {
    if (subtask.id !== subtaskId || subtask.title === clean) return subtask;

    changed = true;
    return { ...subtask, title: clean };
  });

  return changed ? next : subtasks;
}

/** Ticking a step by hand is always the person's own doing, so the parent's
 * claim on it is dropped either way. */
export function toggleSubtask(
  subtasks: readonly Subtask[],
  subtaskId: string,
  atMs: number,
): readonly Subtask[] {
  let changed = false;
  const next = subtasks.map(subtask => {
    if (subtask.id !== subtaskId) return subtask;

    changed = true;
    return {
      ...subtask,
      completedAtMs: isSubtaskDone(subtask) ? null : atMs,
      closedWithParent: false,
    };
  });

  return changed ? next : subtasks;
}

export function removeSubtask(
  subtasks: readonly Subtask[],
  subtaskId: string,
): readonly Subtask[] {
  const next = subtasks.filter(subtask => subtask.id !== subtaskId);

  return next.length === subtasks.length ? subtasks : next;
}

/** Closes whatever is still open, marking it as the parent's doing. */
export function closeOpenSubtasks(
  subtasks: readonly Subtask[],
  atMs: number,
): readonly Subtask[] {
  if (subtasks.every(isSubtaskDone)) return subtasks;

  return subtasks.map(subtask =>
    isSubtaskDone(subtask)
      ? subtask
      : { ...subtask, completedAtMs: atMs, closedWithParent: true },
  );
}

/** Puts back exactly what the parent took down, and leaves alone anything the
 * person had already ticked themselves. */
export function reopenSubtasksClosedWithParent(
  subtasks: readonly Subtask[],
): readonly Subtask[] {
  if (!subtasks.some(subtask => subtask.closedWithParent)) return subtasks;

  return subtasks.map(subtask =>
    subtask.closedWithParent
      ? { ...subtask, completedAtMs: null, closedWithParent: false }
      : subtask,
  );
}

/**
 * Stored subtasks come off the device's disk and out of a shared document, so
 * they are read as untrusted input in the same way tasks are.
 */
export function sanitizeSubtasks(value: unknown): Subtask[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const subtasks: Subtask[] = [];

  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    if (subtasks.length >= MAX_SUBTASKS) break;

    const candidate = entry as Partial<Record<keyof Subtask, unknown>>;
    const id = typeof candidate.id === 'string' ? candidate.id : null;
    const title =
      typeof candidate.title === 'string'
        ? normalizeSubtaskTitle(candidate.title)
        : '';

    if (id == null || title.length === 0 || seen.has(id)) continue;

    seen.add(id);
    subtasks.push({
      id,
      title,
      completedAtMs:
        typeof candidate.completedAtMs === 'number' &&
        Number.isFinite(candidate.completedAtMs)
          ? candidate.completedAtMs
          : null,
      closedWithParent: candidate.closedWithParent === true,
      createdAtMs:
        typeof candidate.createdAtMs === 'number' &&
        Number.isFinite(candidate.createdAtMs)
          ? candidate.createdAtMs
          : 0,
    });
  }

  return subtasks;
}
