import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PreferencesStore } from '../../application/ports/PreferencesStore';

const STORAGE_KEY = 'ideias.preferences.v1';

export const asyncStoragePreferencesStore: PreferencesStore = {
  async load() {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored == null) return null;

    try {
      return JSON.parse(stored);
    } catch {
      // A corrupted payload is discarded so the app starts from its defaults.
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },
  async save(preferences) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  },
};
