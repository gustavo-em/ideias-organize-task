import { sanitizeAssignedIds, type Task } from './Task';

/**
 * Who took what inside a shared project, indexed by person.
 *
 * The map is keyed by uid — never by task — because that is the only shape a
 * security rule can police: a write from somebody who is not the owner may
 * touch `assignments[<their own uid>]` and nothing else, exactly like the day
 * document already does with `members.<uid>`. Firestore rules cannot look
 * inside the `tasks` array of maps to answer "did this person only add
 * themselves?", so assignment never travels in there.
 */
export type AssignmentMap = Readonly<Record<string, readonly string[]>>;

export function sanitizeAssignments(value: unknown): AssignmentMap {
  if (typeof value !== 'object' || value === null) return {};

  const map: Record<string, readonly string[]> = {};
  for (const [personId, taskIds] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (personId.length === 0) continue;

    const ids = sanitizeAssignedIds(taskIds);
    if (ids.length > 0) map[personId] = ids;
  }

  return map;
}

/** The uids taking one task, in the order the map lists them. */
export function toAssignedIds(
  assignments: AssignmentMap,
  taskId: string,
): readonly string[] {
  return Object.keys(assignments).filter(personId =>
    (assignments[personId] ?? []).includes(taskId),
  );
}

/** Puts the per-task view back onto every task of a project. */
export function withAssignments<T extends Task>(
  tasks: readonly T[],
  assignments: AssignmentMap,
): T[] {
  return tasks.map(task => ({
    ...task,
    assignedIds: toAssignedIds(assignments, task.id),
  }));
}

/** Adds the task to that person's entry, or takes it out if it is there. */
export function toggleAssignment(
  assignments: AssignmentMap,
  personId: string,
  taskId: string,
): AssignmentMap {
  const current = assignments[personId] ?? [];
  const next = current.includes(taskId)
    ? current.filter(id => id !== taskId)
    : [...current, taskId];

  return { ...assignments, [personId]: next };
}

/**
 * The permission model, in one place.
 *
 * The owner may take anybody in or out of any task; everybody else may only
 * move their own uid. This mirrors the security rule and never replaces it:
 * the rule is what actually refuses the write.
 */
export function canToggleAssignment(input: {
  isOwner: boolean;
  actorId: string;
  targetId: string;
}): boolean {
  return input.isOwner || input.actorId === input.targetId;
}
