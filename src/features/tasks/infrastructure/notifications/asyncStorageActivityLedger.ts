import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  ActivityLedgerStore,
  ProjectActivityLedger,
} from '../../application/ports/ActivityLedgerStore';

const KEY_PREFIX = 'ideias.activityLedger.v1.';

/** How many keys one project keeps. A project never has hundreds of new facts
 * between two pulls, and the oldest ones can no longer come back as "new":
 * whatever fell off the end is already older than everything still here. */
const MAX_KEYS = 200;

const EMPTY: ProjectActivityLedger = { keys: [], bootstrapped: false };

export const asyncStorageActivityLedger: ActivityLedgerStore = {
  async load(token) {
    const stored = await AsyncStorage.getItem(`${KEY_PREFIX}${token}`);
    if (stored == null) return EMPTY;

    try {
      const parsed = JSON.parse(stored);
      if (typeof parsed !== 'object' || parsed === null) return EMPTY;

      const keys = Array.isArray((parsed as ProjectActivityLedger).keys)
        ? (parsed as ProjectActivityLedger).keys.filter(
            (key): key is string => typeof key === 'string',
          )
        : [];

      return {
        keys,
        bootstrapped: (parsed as ProjectActivityLedger).bootstrapped === true,
      };
    } catch {
      // A ledger that cannot be read is treated as a project never seen: the
      // next pass bootstraps in silence rather than announcing old facts.
      await AsyncStorage.removeItem(`${KEY_PREFIX}${token}`);
      return EMPTY;
    }
  },

  async save(token, ledger) {
    const keys = ledger.keys.slice(-MAX_KEYS);

    await AsyncStorage.setItem(
      `${KEY_PREFIX}${token}`,
      JSON.stringify({ keys, bootstrapped: ledger.bootstrapped }),
    );
  },

  async reset() {
    // The stored keys are the index. Keeping a second list of them would be a
    // read-modify-write of its own, and two projects saved at the same time
    // would drop one from it — a project silently left out of the reset is a
    // project that announces its whole history the next time it is pulled.
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter(key => key.startsWith(KEY_PREFIX));
    if (mine.length === 0) return;

    await Promise.all(mine.map(key => AsyncStorage.removeItem(key)));
  },
};
