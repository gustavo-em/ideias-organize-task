import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GroupStreakStore } from '../../application/ports/GroupStreakStore';
import type { ListStore } from '../../application/ports/ListStore';
import type { ProgressStore } from '../../application/ports/ProgressStore';
import type { TaskStore } from '../../application/ports/TaskStore';
import type { TrioStore } from '../../application/ports/TrioStore';

/**
 * What one account wrote on this device.
 *
 * Every key is suffixed with the account's uid. Before that, the five keys
 * were shared by whoever happened to be signed in, so the only way to keep one
 * person's day off another person's screen was to erase them on the way out —
 * and signing back into the same account found nothing left. Two accounts on
 * one phone now keep two sets, and leaving does not destroy either.
 */
const KEYS = {
  tasks: 'ideias.tasks.v1',
  lists: 'ideias.lists.v1',
  progress: 'ideias.progress.v1',
  trio: 'ideias.trio.v1',
  groupStreaks: 'ideias.groupStreaks.v1',
} as const;

type StoreKind = keyof typeof KEYS;

const KINDS: readonly StoreKind[] = [
  'tasks',
  'lists',
  'progress',
  'trio',
  'groupStreaks',
];

/** Which account the un-suffixed keys belong to. Kept for the migration: the
 * data written before this change has no uid in its name, and adopting it for
 * the wrong account would hand somebody else's day over. Device preferences
 * (theme, language, onboarding) are not personal data and live elsewhere. */
const OWNER_KEY = 'ideias.session.owner.v1';

function keyFor(kind: StoreKind, personId: string): string {
  return `${KEYS[kind]}:${personId}`;
}

/**
 * Reading one key.
 *
 * A payload that cannot be parsed is removed rather than kept: it will not
 * start working on the next run, and leaving it there means failing the same
 * way every morning.
 */
async function read(key: string): Promise<unknown> {
  const stored = await AsyncStorage.getItem(key);

  if (stored == null) return null;

  try {
    return JSON.parse(stored);
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export interface LocalTaskStores {
  taskStore: TaskStore;
  listStore: ListStore;
  progressStore: ProgressStore;
  trioStore: TrioStore;
  groupStreakStore: GroupStreakStore;
}

/** The five stores, bound to one account. */
export function createLocalTaskStores(personId: string): LocalTaskStores {
  return {
    taskStore: {
      load: () => read(keyFor('tasks', personId)),
      save: tasks => write(keyFor('tasks', personId), tasks),
    },
    listStore: {
      load: () => read(keyFor('lists', personId)),
      save: lists => write(keyFor('lists', personId), lists),
    },
    progressStore: {
      load: () => read(keyFor('progress', personId)),
      save: progress => write(keyFor('progress', personId), progress),
    },
    trioStore: {
      load: () => read(keyFor('trio', personId)),
      save: trio => write(keyFor('trio', personId), trio),
    },
    groupStreakStore: {
      load: () => read(keyFor('groupStreaks', personId)),
      save: streaks => write(keyFor('groupStreaks', personId), streaks),
    },
  };
}

/** Everything one account wrote on this device, removed in one go. Only the
 * account named here — nobody else's set is touched. */
export async function clearLocalTaskData(personId: string): Promise<void> {
  await Promise.all(
    KINDS.map(kind => AsyncStorage.removeItem(keyFor(kind, personId))),
  );
}

/** Whatever one account has on this device right now, for the backup. */
export async function readLocalWorkspace(
  personId: string,
): Promise<Record<StoreKind, unknown>> {
  const entries = await Promise.all(
    KINDS.map(
      async kind => [kind, await read(keyFor(kind, personId))] as const,
    ),
  );

  return Object.fromEntries(entries) as Record<StoreKind, unknown>;
}

/** True when this account has nothing here — the question the restore asks
 * before pulling a backup down over something already on the device. */
export async function isLocalWorkspaceEmpty(
  personId: string,
): Promise<boolean> {
  const stored = await Promise.all(
    KINDS.map(kind => AsyncStorage.getItem(keyFor(kind, personId))),
  );

  return stored.every(value => value == null);
}

/** Writes a whole workspace at once, used by the restore. */
export async function writeLocalWorkspace(
  personId: string,
  workspace: Partial<Record<StoreKind, unknown>>,
): Promise<void> {
  await Promise.all(
    KINDS.filter(kind => workspace[kind] != null).map(kind =>
      write(keyFor(kind, personId), workspace[kind]),
    ),
  );
}

/**
 * Moves the pre-namespace data over to the account that owns it.
 *
 * Runs once per device. The un-suffixed keys are adopted only when the stored
 * owner is this same account — an unclaimed set could belong to anybody, and
 * opening somebody else's day costs more than opening an empty one. Either
 * way the old keys are gone afterwards, so this never runs twice.
 */
export async function adoptLegacyTaskData(personId: string): Promise<void> {
  const owner = await AsyncStorage.getItem(OWNER_KEY);
  const legacy = await Promise.all(
    KINDS.map(
      async kind => [kind, await AsyncStorage.getItem(KEYS[kind])] as const,
    ),
  );

  if (owner === personId) {
    await Promise.all(
      legacy
        .filter(([, value]) => value != null)
        .map(([kind, value]) =>
          AsyncStorage.setItem(keyFor(kind, personId), value as string),
        ),
    );
  }

  await Promise.all([
    ...KINDS.map(kind => AsyncStorage.removeItem(KEYS[kind])),
    AsyncStorage.removeItem(OWNER_KEY),
  ]);
}
