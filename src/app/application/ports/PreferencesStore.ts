import type { AppPreferences } from '../../domain/AppPreferences';

export interface PreferencesStore {
  load(): Promise<unknown>;
  save(preferences: AppPreferences): Promise<void>;
}
