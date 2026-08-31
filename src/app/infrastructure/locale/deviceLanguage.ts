import { NativeModules, Platform } from 'react-native';

import type { AppLanguage } from '../../../features/tasks/presentation/localization/taskCopy';

/**
 * The language tags the phone reports, most preferred first.
 *
 * Read from the platform's own settings rather than through a library: two
 * tags are all this app needs, and a dependency for that is a dependency to
 * keep upgrading forever.
 */
export function getDeviceLanguageTags(): readonly string[] {
  try {
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      const tags: unknown =
        settings?.AppleLanguages ?? settings?.AppleLocale ?? null;

      if (Array.isArray(tags))
        return tags.filter(tag => typeof tag === 'string');
      if (typeof tags === 'string') return [tags];

      return [];
    }

    const identifier = NativeModules.I18nManager?.localeIdentifier;

    return typeof identifier === 'string' ? [identifier] : [];
  } catch {
    // A phone that will not say what language it is in is not a reason to fail
    // to start; the default language covers it.
    return [];
  }
}

/** The app's language for a device, or null when none of them is offered. */
export function matchAppLanguage(
  tags: readonly string[] = getDeviceLanguageTags(),
): AppLanguage | null {
  for (const tag of tags) {
    const normalized = tag.replace('_', '-').toLowerCase();

    if (normalized.startsWith('pt')) return 'pt-BR';
    if (normalized.startsWith('en')) return 'en-US';
  }

  return null;
}
