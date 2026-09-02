import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  asyncStorageListStore,
  asyncStorageProgressStore,
  asyncStorageTaskStore,
  clearDataOwner,
  clearLocalTaskData,
  readDataOwner,
  writeDataOwner,
} from '../src/features/tasks/infrastructure/storage/asyncStorageStores';

describe('local data ownership', () => {
  it('takes every personal key off the device and keeps preferences', async () => {
    await asyncStorageTaskStore.save([
      {
        id: 'one',
        title: 'Tarefa da outra conta',
        listId: 'inbox',
        priority: 'medium',
        dueAtMs: null,
        estimatedMinutes: null,
        createdAtMs: 1,
        completedAtMs: null,
        subtasks: [],
      },
    ]);
    await asyncStorageListStore.save([
      { id: 'inbox', name: 'Caixa', color: 'sun', icon: 'inbox' },
    ]);
    await asyncStorageProgressStore.save({
      points: 44,
      streakDays: 1,
      lastTrioDayMs: 0,
      days: [],
    });
    await AsyncStorage.setItem('ideias.preferences.v1', '{"language":"pt-BR"}');

    await clearLocalTaskData();

    expect(await asyncStorageTaskStore.load()).toBeNull();
    expect(await asyncStorageListStore.load()).toBeNull();
    expect(await asyncStorageProgressStore.load()).toBeNull();
    expect(await AsyncStorage.getItem('ideias.preferences.v1')).toBe(
      '{"language":"pt-BR"}',
    );
  });

  it('records which account the stored data belongs to', async () => {
    expect(await readDataOwner()).toBeNull();

    await writeDataOwner('uid-one');
    expect(await readDataOwner()).toBe('uid-one');

    await clearDataOwner();
    expect(await readDataOwner()).toBeNull();
  });
});
