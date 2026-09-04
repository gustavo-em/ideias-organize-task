import type { ActivityLedgerStore } from '../src/features/tasks/application/ports/ActivityLedgerStore';
import type { ActivityNotifier } from '../src/features/tasks/application/ports/ActivityNotifier';
import {
  claimActivityKey,
  reportProjectActivity,
} from '../src/features/tasks/application/useCases/checkProjectActivity';
import {
  activityEventKey,
  detectProjectActivity,
  type ProjectActivityEvent,
} from '../src/features/tasks/domain/ProjectActivity';
import type { Task } from '../src/features/tasks/domain/Task';
import type {
  ListMember,
  TaskList,
} from '../src/features/tasks/domain/TaskList';
import { activityNotificationLines } from '../src/features/tasks/presentation/localization/activityNotificationCopy';
import { asyncStorageActivityLedger } from '../src/features/tasks/infrastructure/notifications/asyncStorageActivityLedger';

const ME = 'p-me';

const me: ListMember = {
  personId: ME,
  name: 'Joana Melo',
  handle: 'joana',
  role: 'owner',
  joined: true,
};
const other: ListMember = {
  personId: 'p-other',
  name: 'Rafa',
  handle: 'rafa',
  role: 'editor',
  joined: true,
};

function taskOf(overrides: Partial<Task>): Task {
  return {
    id: 't-1',
    title: 'Comprar leite',
    listId: 'compras',
    priority: 'medium',
    dueAtMs: null,
    estimatedMinutes: null,
    createdAtMs: 1000,
    completedAtMs: null,
    completedBy: null,
    subtasks: [],
    ...overrides,
  } as Task;
}

function projectOf(
  members: readonly ListMember[],
  tasks: readonly Task[],
): { list: TaskList; tasks: readonly Task[] } {
  return {
    list: {
      id: 'compras',
      name: 'Compras da casa',
      color: 'sun',
      icon: 'cart',
      share: { token: 'abc123', invitedAs: 'editor', members },
    },
    tasks,
  };
}

describe('project activity detection', () => {
  it('reports a task another member closed', () => {
    const events = detectProjectActivity(
      projectOf(
        [me, other],
        [taskOf({ completedAtMs: 2000, completedBy: other.personId })],
      ),
      ['j:abc123:p-other'],
      ME,
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 'task-completed',
      taskTitle: 'Comprar leite',
      projectName: 'Compras da casa',
    });
    expect(activityEventKey(events[0])).toBe('c:abc123:t-1:2000');
  });

  it('never reports what the signed-in account did itself', () => {
    const events = detectProjectActivity(
      projectOf(
        [me, other],
        [taskOf({ completedAtMs: 2000, completedBy: ME })],
      ),
      [],
      ME,
    );

    expect(events.filter(event => event.kind === 'task-completed')).toEqual([]);
  });

  it('reports a member who joined, once', () => {
    const project = projectOf([me, other], []);
    const events = detectProjectActivity(project, [], ME);

    expect(events).toEqual([
      expect.objectContaining({
        kind: 'member-joined',
        personId: other.personId,
      }),
    ]);
    expect(
      detectProjectActivity(project, [activityEventKey(events[0])], ME),
    ).toEqual([]);
  });

  it('names people by name or handle, never by an address', () => {
    const addressLike = { ...other, name: 'rafa@example.com', handle: 'rafa' };
    const [joined] = detectProjectActivity(
      projectOf([me, addressLike], []),
      [],
      ME,
    );

    expect(activityNotificationLines(joined, 'pt-BR').body).toBe(
      '@rafa entrou em Compras da casa',
    );
    expect(activityNotificationLines(joined, 'en-US').body).toBe(
      '@rafa joined Compras da casa',
    );
  });

  it('writes the completion line in both languages', () => {
    const [completed] = detectProjectActivity(
      projectOf(
        [me, other],
        [taskOf({ completedAtMs: 2000, completedBy: other.personId })],
      ),
      [],
      ME,
    );

    expect(activityNotificationLines(completed, 'pt-BR')).toEqual({
      title: 'Compras da casa',
      body: 'Rafa concluiu “Comprar leite”',
    });
    expect(activityNotificationLines(completed, 'en-US').body).toBe(
      'Rafa completed “Comprar leite”',
    );
  });
});

describe('reporting project activity', () => {
  function fakeNotifier(): ActivityNotifier & {
    shown: ProjectActivityEvent[];
  } {
    const shown: ProjectActivityEvent[] = [];

    return {
      shown,
      isAllowed: async () => true,
      present: async events => {
        shown.push(...events);
      },
    };
  }

  const enabledDeps = (
    ledger: ActivityLedgerStore,
    notifier: ActivityNotifier,
  ) => ({
    ledger,
    notifier,
    language: 'pt-BR' as const,
    meId: ME,
    enabled: true,
  });

  it('says nothing the first time it sees a project', async () => {
    const notifier = fakeNotifier();
    const project = projectOf(
      [me, other],
      [taskOf({ completedAtMs: 2000, completedBy: other.personId })],
    );

    const shown = await reportProjectActivity(
      project,
      enabledDeps(asyncStorageActivityLedger, notifier),
    );

    expect(shown).toBe(0);
    expect(notifier.shown).toEqual([]);
  });

  it('announces a fact once, however many times the same state is pulled', async () => {
    const notifier = fakeNotifier();
    const deps = enabledDeps(asyncStorageActivityLedger, notifier);
    const before = projectOf([me, other], [taskOf({})]);
    const after = projectOf(
      [me, other],
      [taskOf({ completedAtMs: 2000, completedBy: other.personId })],
    );

    await reportProjectActivity(before, deps);
    expect(await reportProjectActivity(after, deps)).toBe(1);
    expect(await reportProjectActivity(after, deps)).toBe(0);
    expect(notifier.shown).toHaveLength(1);
  });

  it('announces a fact once when two pulls of the same project overlap', async () => {
    const notifier = fakeNotifier();
    const deps = enabledDeps(asyncStorageActivityLedger, notifier);
    const before = projectOf([me, other], [taskOf({})]);
    const after = projectOf(
      [me, other],
      [taskOf({ completedAtMs: 2000, completedBy: other.personId })],
    );

    await reportProjectActivity(before, deps);

    // Neither call is awaited before the other starts: the tab's first paint,
    // a pull to refresh and the return to the foreground all overlap in
    // practice.
    const [first, second] = await Promise.all([
      reportProjectActivity(after, deps),
      reportProjectActivity(after, deps),
    ]);

    expect(first + second).toBe(1);
    expect(notifier.shown).toHaveLength(1);
  });

  it('lets push and the sync layer claim a fact only once', async () => {
    const notifier = fakeNotifier();
    const deps = enabledDeps(asyncStorageActivityLedger, notifier);
    const before = projectOf([me, other], [taskOf({})]);
    const after = projectOf(
      [me, other],
      [taskOf({ completedAtMs: 2000, completedBy: other.personId })],
    );

    await reportProjectActivity(before, deps);

    // The push arrives first and claims the key; the pull that follows finds
    // it already told.
    expect(
      await claimActivityKey(
        'abc123',
        'c:abc123:t-1:2000',
        asyncStorageActivityLedger,
      ),
    ).toBe(true);
    expect(await reportProjectActivity(after, deps)).toBe(0);
    expect(notifier.shown).toEqual([]);
  });

  it('forgets every project on reset, whatever order they were saved in', async () => {
    const notifier = fakeNotifier();
    const deps = enabledDeps(asyncStorageActivityLedger, notifier);

    await Promise.all([
      reportProjectActivity(projectOf([me, other], []), deps),
      reportProjectActivity(
        {
          list: {
            ...projectOf([me, other], []).list,
            id: 'obra',
            name: 'Obra',
            share: { token: 'zzz999', invitedAs: 'editor', members: [me] },
          },
          tasks: [],
        },
        deps,
      ),
    ]);

    await asyncStorageActivityLedger.reset();

    expect(await asyncStorageActivityLedger.load('abc123')).toEqual({
      keys: [],
      bootstrapped: false,
    });
    expect(await asyncStorageActivityLedger.load('zzz999')).toEqual({
      keys: [],
      bootstrapped: false,
    });
  });

  it('shows one summary when a pull brings more than three facts', async () => {
    const notifier = fakeNotifier();
    const deps = enabledDeps(asyncStorageActivityLedger, notifier);
    const tasks = [1, 2, 3, 4].map(index =>
      taskOf({ id: `t-${index}`, title: `Tarefa ${index}` }),
    );

    await reportProjectActivity(projectOf([me, other], tasks), deps);

    const closed = tasks.map(task => ({
      ...task,
      completedAtMs: 3000,
      completedBy: other.personId,
    }));

    expect(
      await reportProjectActivity(projectOf([me, other], closed), deps),
    ).toBe(1);
    expect(notifier.shown).toHaveLength(4);
  });

  it('stays quiet while the setting is off, and records nothing', async () => {
    const notifier = fakeNotifier();
    const project = projectOf(
      [me, other],
      [taskOf({ completedAtMs: 2000, completedBy: other.personId })],
    );

    const shown = await reportProjectActivity(project, {
      ...enabledDeps(asyncStorageActivityLedger, notifier),
      enabled: false,
    });

    expect(shown).toBe(0);
    expect(notifier.shown).toEqual([]);
    expect(await asyncStorageActivityLedger.load('abc123')).toEqual({
      keys: [],
      bootstrapped: false,
    });
  });

  it('records the facts but shows nothing while the permission is refused', async () => {
    const notifier = { ...fakeNotifier(), isAllowed: async () => false };
    const deps = enabledDeps(asyncStorageActivityLedger, notifier);
    const before = projectOf([me, other], [taskOf({})]);
    const after = projectOf(
      [me, other],
      [taskOf({ completedAtMs: 2000, completedBy: other.personId })],
    );

    await reportProjectActivity(before, deps);
    expect(await reportProjectActivity(after, deps)).toBe(0);

    const ledger = await asyncStorageActivityLedger.load('abc123');
    expect(ledger.keys).toContain('c:abc123:t-1:2000');
  });
});
