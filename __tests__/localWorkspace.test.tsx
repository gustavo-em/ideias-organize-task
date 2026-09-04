import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create } from 'react-test-renderer';

import {
  adoptLegacyTaskData,
  clearLocalTaskData,
  createLocalTaskStores,
  isLocalWorkspaceEmpty,
  readLocalWorkspace,
  writeLocalWorkspace,
} from '../src/features/tasks/infrastructure/storage/asyncStorageStores';
import type { WorkspaceBackupGateway } from '../src/features/tasks/infrastructure/storage/firestoreWorkspaceBackup';
import { useLocalWorkspace } from '../src/app/session/useLocalWorkspace';

const ANA = 'uid-ana';
const BRUNO = 'uid-bruno';

function list(name: string) {
  return [{ id: 'inbox', name, color: 'sun', icon: 'inbox' }] as const;
}

function Probe({
  backup,
  personId,
  onStatus,
}: {
  backup: WorkspaceBackupGateway;
  personId: string | null;
  onStatus: (status: string) => void;
}) {
  onStatus(useLocalWorkspace(personId, backup));
  return null;
}

async function mountProbe(
  personId: string | null,
  backup: WorkspaceBackupGateway,
) {
  const seen: string[] = [];
  let tree: ReturnType<typeof create> | null = null;

  await act(async () => {
    tree = create(
      <Probe
        backup={backup}
        onStatus={s => seen.push(s)}
        personId={personId}
      />,
    );
  });

  await act(async () => {
    await Promise.resolve();
  });

  (tree as unknown as ReturnType<typeof create>).unmount();
  return seen;
}

const silentBackup: WorkspaceBackupGateway = {
  save: async () => undefined,
  load: async () => null,
};

describe('a workspace per account', () => {
  it('keeps two accounts apart on one device', async () => {
    await createLocalTaskStores(ANA).listStore.save(list('Casa da Ana'));
    await createLocalTaskStores(BRUNO).listStore.save(list('Casa do Bruno'));

    expect(await createLocalTaskStores(ANA).listStore.load()).toEqual(
      list('Casa da Ana'),
    );
    expect(await createLocalTaskStores(BRUNO).listStore.load()).toEqual(
      list('Casa do Bruno'),
    );
  });

  it('survives signing out and back into the same account', async () => {
    // The reported bug: leaving the account used to take its data with it,
    // and coming back opened an empty app. Nothing is erased on the way out
    // any more, so the same uid finds the same workspace.
    const stores = createLocalTaskStores(ANA);
    await stores.listStore.save(list('Casa'));

    // Signing out and back in mounts the session hook again, with no wipe in
    // between and nothing for the restore to do.
    const seen = await mountProbe(ANA, silentBackup);

    expect(seen[seen.length - 1]).toBe('ready');
    expect(await createLocalTaskStores(ANA).listStore.load()).toEqual(
      list('Casa'),
    );
  });

  it('clears one account without touching the other, or the preferences', async () => {
    await createLocalTaskStores(ANA).listStore.save(list('Casa da Ana'));
    await createLocalTaskStores(BRUNO).listStore.save(list('Casa do Bruno'));
    await AsyncStorage.setItem('ideias.preferences.v1', '{"language":"pt-BR"}');

    await clearLocalTaskData(ANA);

    expect(await createLocalTaskStores(ANA).listStore.load()).toBeNull();
    expect(await createLocalTaskStores(BRUNO).listStore.load()).toEqual(
      list('Casa do Bruno'),
    );
    expect(await AsyncStorage.getItem('ideias.preferences.v1')).toBe(
      '{"language":"pt-BR"}',
    );
  });
});

describe('the walk from the pre-namespace keys', () => {
  it('hands the old data to the account that owned it', async () => {
    await AsyncStorage.setItem(
      'ideias.lists.v1',
      JSON.stringify(list('Casa antiga')),
    );
    await AsyncStorage.setItem('ideias.session.owner.v1', ANA);

    await adoptLegacyTaskData(ANA);

    expect(await createLocalTaskStores(ANA).listStore.load()).toEqual(
      list('Casa antiga'),
    );
    // Once walked, never walked again.
    expect(await AsyncStorage.getItem('ideias.lists.v1')).toBeNull();
    expect(await AsyncStorage.getItem('ideias.session.owner.v1')).toBeNull();
  });

  it('drops an unclaimed set rather than handing it to the wrong account', async () => {
    // An owner that is not this account — opening somebody else's day costs
    // more than opening an empty one.
    await AsyncStorage.setItem(
      'ideias.lists.v1',
      JSON.stringify(list('Casa do Bruno')),
    );
    await AsyncStorage.setItem('ideias.session.owner.v1', BRUNO);

    await adoptLegacyTaskData(ANA);

    expect(await createLocalTaskStores(ANA).listStore.load()).toBeNull();
    expect(await AsyncStorage.getItem('ideias.lists.v1')).toBeNull();
  });
});

describe('the server backup', () => {
  it('restores onto a device that has nothing for this account', async () => {
    // A new phone, a reinstall, or an account that never wrote here.
    const backup: WorkspaceBackupGateway = {
      save: async () => undefined,
      load: async () => ({ lists: list('Casa restaurada') }),
    };

    expect(await isLocalWorkspaceEmpty(ANA)).toBe(true);

    const seen = await mountProbe(ANA, backup);

    expect(seen[seen.length - 1]).toBe('ready');
    expect(await createLocalTaskStores(ANA).listStore.load()).toEqual(
      list('Casa restaurada'),
    );
  });

  it('never writes over what the device already has', async () => {
    // The device is where the person has been working: it is the newer copy
    // by definition, and a backup landing on top of it would lose the day.
    await createLocalTaskStores(ANA).listStore.save(list('Casa do aparelho'));

    const backup: WorkspaceBackupGateway = {
      save: async () => undefined,
      load: async () => ({ lists: list('Casa antiga do servidor') }),
    };

    await mountProbe(ANA, backup);

    expect(await createLocalTaskStores(ANA).listStore.load()).toEqual(
      list('Casa do aparelho'),
    );
  });

  it('opens the app even when the backup cannot be reached', async () => {
    const backup: WorkspaceBackupGateway = {
      save: async () => undefined,
      load: async () => {
        throw new Error('offline');
      },
    };

    const seen = await mountProbe(ANA, backup);

    expect(seen[seen.length - 1]).toBe('ready');
  });

  it('reads back exactly what the stores wrote', async () => {
    const stores = createLocalTaskStores(ANA);
    await stores.listStore.save(list('Casa'));
    await stores.progressStore.save({
      points: 44,
      streakDays: 1,
      lastTrioDayMs: 0,
      days: [],
    });

    const snapshot = await readLocalWorkspace(ANA);

    expect(snapshot.lists).toEqual(list('Casa'));
    expect(snapshot.progress).toEqual({
      points: 44,
      streakDays: 1,
      lastTrioDayMs: 0,
      days: [],
    });
    expect(snapshot.tasks).toBeNull();
  });

  it('writes back only the parts the backup had', async () => {
    await createLocalTaskStores(ANA).taskStore.save([]);

    await writeLocalWorkspace(ANA, { lists: list('Casa'), tasks: null });

    expect(await createLocalTaskStores(ANA).listStore.load()).toEqual(
      list('Casa'),
    );
    // A part the backup did not carry leaves the device's own alone.
    expect(await createLocalTaskStores(ANA).taskStore.load()).toEqual([]);
  });
});
