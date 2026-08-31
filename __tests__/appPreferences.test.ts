import {
  DEFAULT_APP_PREFERENCES,
  sanitizeAppPreferences,
} from '../src/app/domain/AppPreferences';

describe('app preferences', () => {
  it('keeps what was stored when it is a value the app offers', () => {
    const stored = {
      appearanceMode: 'dark',
      language: 'en-US',
      dayCapacity: 5,
      hasSeenOnboarding: true,
    };

    expect(sanitizeAppPreferences(stored)).toEqual(stored);
  });

  it('falls back for anything it does not recognise', () => {
    const stored = {
      appearanceMode: 'sepia',
      language: 'fr-FR',
      dayCapacity: 9,
      hasSeenOnboarding: 'sim',
    };

    expect(sanitizeAppPreferences(stored)).toEqual(DEFAULT_APP_PREFERENCES);
  });

  it('reads a corrupted payload as the defaults it was given', () => {
    const defaults = { ...DEFAULT_APP_PREFERENCES, language: 'en-US' } as const;

    expect(sanitizeAppPreferences('nonsense', defaults)).toEqual(defaults);
    expect(sanitizeAppPreferences(null, defaults)).toEqual(defaults);
  });

  it('keeps a device language that a stored choice has not overridden', () => {
    const defaults = { ...DEFAULT_APP_PREFERENCES, language: 'en-US' } as const;

    expect(
      sanitizeAppPreferences({ appearanceMode: 'dark' }, defaults),
    ).toEqual({ ...defaults, appearanceMode: 'dark' });
  });
});
