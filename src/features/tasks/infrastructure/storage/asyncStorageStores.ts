import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GroupStreakStore } from '../../application/ports/GroupStreakStore';
import type { ListStore } from '../../application/ports/ListStore';
import type { ProgressStore } from '../../application/ports/ProgressStore';
import type { TaskStore } from '../../application/ports/TaskStore';
import type { TrioStore } from '../../application/ports/TrioStore';

const KEYS = {
  tasks: 'ideias.tasks.v1',
  lists: 'ideias.lists.v1',
  progress: 'ideias.progress.v1',
  trio: 'ideias.trio.v1',
  groupStreaks: 'ideias.groupStreaks.v1',
} as const;

/** Which account the data on this device belongs to. Device preferences
 * (theme, language, onboarding) are not personal data and live elsewhere. */
const OWNER_KEY = 'ideias.session.owner.v1';

const PERSONAL_KEYS: readonly string[] = [
  KEYS.tasks,
  KEYS.lists,
  KEYS.progress,
  KEYS.trio,
  KEYS.groupStreaks,
];

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

export const asyncStorageTaskStore: TaskStore = {
  load: () => read(KEYS.tasks),
  save: tasks => write(KEYS.tasks, tasks),
};

export const asyncStorageListStore: ListStore = {
  load: () => read(KEYS.lists),
  save: lists => write(KEYS.lists, lists),
};

export const asyncStorageProgressStore: ProgressStore = {
  load: () => read(KEYS.progress),
  save: progress => write(KEYS.progress, progress),
};

export const asyncStorageTrioStore: TrioStore = {
  load: () => read(KEYS.trio),
  save: trio => write(KEYS.trio, trio),
};

export const asyncStorageGroupStreakStore: GroupStreakStore = {
  load: () => read(KEYS.groupStreaks),
  save: streaks => write(KEYS.groupStreaks, streaks),
};

/**
 * Everything one account wrote on this device, removed in one go.
 *
 * Signing out or signing in as somebody else must not leave another person's
 * tasks on screen: what one account wrote is never what the next one reads.
 */
export async function clearLocalTaskData(): Promise<void> {
  await Promise.all(PERSONAL_KEYS.map(key => AsyncStorage.removeItem(key)));
}

/** The account the stored data belongs to, or null on a clean device. */
export async function readDataOwner(): Promise<string | null> {
  return AsyncStorage.getItem(OWNER_KEY);
}

export async function writeDataOwner(personId: string): Promise<void> {
  await AsyncStorage.setItem(OWNER_KEY, personId);
}

export async function clearDataOwner(): Promise<void> {
  await AsyncStorage.removeItem(OWNER_KEY);
}
