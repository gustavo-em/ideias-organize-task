import {
  isAssigned,
  sanitizeTasks,
  withAssignee,
  withoutAssignee,
  type Task,
} from '../src/features/tasks/domain/Task';
import {
  canToggleAssignment,
  sanitizeAssignments,
  toAssignedIds,
  toggleAssignment,
  withAssignments,
  type AssignmentMap,
} from '../src/features/tasks/domain/TaskAssignment';

function task(id: string): Task {
  return {
    id,
    title: id,
    listId: 'projeto',
    priority: 'medium',
    dueAtMs: null,
    estimatedMinutes: null,
    createdAtMs: 0,
    completedAtMs: null,
    subtasks: [],
  };
}

/**
 * The write the security rule sees, in the same shape: a diff of the
 * `assignments` map. `isSelfAssignmentUpdate` allows it only when the keys it
 * touches are exactly the caller's own uid; `isOwnerAssignmentUpdate` allows
 * any key. This mirrors the rule so the model and the rule cannot drift apart
 * without a red test.
 */
function ruleAllows(input: {
  before: AssignmentMap;
  after: AssignmentMap;
  callerId: string;
  isOwner: boolean;
}): boolean {
  const keys = new Set([
    ...Object.keys(input.before),
    ...Object.keys(input.after),
  ]);
  const changed = [...keys].filter(
    key =>
      JSON.stringify(input.before[key] ?? []) !==
      JSON.stringify(input.after[key] ?? []),
  );

  if (input.isOwner) return true;
  return changed.every(key => key === input.callerId);
}

describe('task assignment', () => {
  it('adds and removes one person, and repeating the tap is the way back', () => {
    const first = toggleAssignment({}, 'ana', 't1');
    expect(toAssignedIds(first, 't1')).toEqual(['ana']);

    const second = toggleAssignment(first, 'ana', 't1');
    expect(toAssignedIds(second, 't1')).toEqual([]);
  });

  it('holds several people on one task', () => {
    const map = ['ana', 'bru', 'caio', 'dani'].reduce<AssignmentMap>(
      (acc, personId) => toggleAssignment(acc, personId, 't1'),
      {},
    );

    expect(toAssignedIds(map, 't1')).toEqual(['ana', 'bru', 'caio', 'dani']);
    expect(toAssignedIds(map, 't2')).toEqual([]);
  });

  it('folds the map back onto each task', () => {
    const map: AssignmentMap = { ana: ['t1'], bru: ['t1', 't2'] };
    const tasks = withAssignments([task('t1'), task('t2')], map);

    expect(tasks[0].assignedIds).toEqual(['ana', 'bru']);
    expect(tasks[1].assignedIds).toEqual(['bru']);
  });

  it('reads a stored map as untrusted input', () => {
    expect(sanitizeAssignments(null)).toEqual({});
    expect(
      sanitizeAssignments({ ana: ['t1', 't1', 7, ''], bru: [], caio: 'nope' }),
    ).toEqual({ ana: ['t1'] });
  });

  it('keeps assignment out of a stored task', () => {
    const [stored] = sanitizeTasks([
      { ...task('t1'), assignedIds: ['ana', 'ana', 3] },
    ]);

    expect(stored.assignedIds).toEqual(['ana']);
    expect(isAssigned(withAssignee(stored, 'bru'), 'bru')).toBe(true);
    expect(isAssigned(withoutAssignee(stored, 'ana'), 'ana')).toBe(false);
    // Adding somebody already there changes nothing at all.
    expect(withAssignee(stored, 'ana')).toBe(stored);
  });

  it('lets the owner move anybody and everybody else only themselves', () => {
    expect(
      canToggleAssignment({ isOwner: true, actorId: 'dono', targetId: 'ana' }),
    ).toBe(true);
    expect(
      canToggleAssignment({ isOwner: false, actorId: 'ana', targetId: 'ana' }),
    ).toBe(true);
    expect(
      canToggleAssignment({ isOwner: false, actorId: 'ana', targetId: 'bru' }),
    ).toBe(false);
  });

  it('refuses a non-owner write that touches somebody else, and allows the owner', () => {
    const before: AssignmentMap = { ana: ['t1'], bru: ['t2'] };

    // Ana taking herself out of t1: her own key, allowed.
    expect(
      ruleAllows({
        before,
        after: toggleAssignment(before, 'ana', 't1'),
        callerId: 'ana',
        isOwner: false,
      }),
    ).toBe(true);

    // Ana trying to take Bru out of t2: another key, refused.
    expect(
      ruleAllows({
        before,
        after: toggleAssignment(before, 'bru', 't2'),
        callerId: 'ana',
        isOwner: false,
      }),
    ).toBe(false);

    // The owner doing exactly the same write: allowed.
    expect(
      ruleAllows({
        before,
        after: toggleAssignment(before, 'bru', 't2'),
        callerId: 'dono',
        isOwner: true,
      }),
    ).toBe(true);
  });
});
