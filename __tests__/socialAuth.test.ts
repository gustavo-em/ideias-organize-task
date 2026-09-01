import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import type { AuthPort } from '../src/features/auth/application/ports/AuthPort';
import { AuthOperationError } from '../src/features/auth/domain/AuthError';
import {
  toAppleErrorKind,
  toFirebaseErrorKind,
  toGoogleErrorKind,
} from '../src/features/auth/infrastructure/firebase/authErrorMapping';
import { getAuthCopy } from '../src/features/auth/presentation/localization/authCopy';
import { validateDisplayName } from '../src/features/auth/presentation/models/validateAuthForm';
import {
  useAuthViewModel,
  type AuthViewModel,
} from '../src/features/auth/presentation/view-models/useAuthViewModel';

/** The hook under test, driven from a real render tree: this suite has no
 * testing-library, and the shell mounts it exactly the same way. */
function mountViewModel(port: AuthPort): () => AuthViewModel {
  let latest: AuthViewModel | null = null;

  function Harness() {
    latest = useAuthViewModel(port);
    return null;
  }

  act(() => {
    create(createElement(Harness));
  });

  return () => {
    if (latest == null) throw new Error('view model never rendered');

    return latest;
  };
}

function makePort(overrides: Partial<AuthPort> = {}): AuthPort {
  return {
    signIn: jest.fn(async () => undefined),
    signUp: jest.fn(async () => undefined),
    sendPasswordReset: jest.fn(async () => undefined),
    signInWithGoogle: jest.fn(async () => undefined),
    signInWithApple: jest.fn(async () => undefined),
    signInAnonymously: jest.fn(async () => undefined),
    signOut: jest.fn(async () => undefined),
    onAuthStateChanged: listener => {
      listener(null);
      return () => undefined;
    },
    ...overrides,
  };
}

describe('name-only account', () => {
  it('asks for a name before creating the account', () => {
    const copy = getAuthCopy('pt-BR');

    expect(validateDisplayName('', copy)).toBe('Digite um nome.');
    expect(validateDisplayName('   ', copy)).toBe('Digite um nome.');
    expect(validateDisplayName('Gustavo', copy)).toBeNull();
  });

  it('says the same thing in en-US', () => {
    const copy = getAuthCopy('en-US');

    expect(validateDisplayName(' ', copy)).toBe('Enter a name.');
    expect(copy.anonymous.settingsNote).toBe('Account on this device only');
  });

  it('warns that the account lives on this device only', () => {
    const copy = getAuthCopy('pt-BR');

    expect(copy.anonymous.notice).toContain('só neste aparelho');
    expect(copy.anonymous.settingsNote).toBe('Conta só neste aparelho');
  });
});

describe('provider error mapping', () => {
  it('tells a cancelled sheet apart from a missing Play Services', () => {
    expect(toGoogleErrorKind('12501')).toBe('cancelled');
    expect(toGoogleErrorKind('PLAY_SERVICES_NOT_AVAILABLE')).toBe(
      'play-services-unavailable',
    );
    expect(toGoogleErrorKind('2')).toBe('play-services-unavailable');
    expect(toAppleErrorKind('1001')).toBe('cancelled');
  });

  it('never falls back to the generic message on the Google button', () => {
    expect(toGoogleErrorKind('12500')).toBe('provider-unavailable');
    expect(toGoogleErrorKind('10')).toBe('provider-unavailable');
    expect(toGoogleErrorKind('NULL_PRESENTER')).toBe('provider-unavailable');
    expect(toGoogleErrorKind(undefined)).toBe('provider-unavailable');
    expect(toGoogleErrorKind('7')).toBe('network');
    expect(toGoogleErrorKind('auth/network-request-failed')).toBe('network');
  });

  it('names a provider the owner has not switched on yet', () => {
    expect(toFirebaseErrorKind('auth/operation-not-allowed')).toBe(
      'provider-unavailable',
    );
    expect(
      toFirebaseErrorKind('auth/account-exists-with-different-credential'),
    ).toBe('account-exists-with-different-credential');
  });

  it('keeps the existing email and password mapping intact', () => {
    expect(toFirebaseErrorKind('auth/wrong-password')).toBe(
      'invalid-credential',
    );
    expect(toFirebaseErrorKind('auth/too-many-requests')).toBe(
      'too-many-requests',
    );
    expect(toFirebaseErrorKind('auth/whatever-comes-next')).toBe('unknown');
  });

  it('has copy for every provider failure, and none for a cancellation', () => {
    (['pt-BR', 'en-US'] as const).forEach(language => {
      const copy = getAuthCopy(language);

      expect(copy.errors['play-services-unavailable'].length).toBeGreaterThan(
        0,
      );
      expect(copy.errors['provider-unavailable'].length).toBeGreaterThan(0);
      expect(copy.errors.cancelled).toBe('');
    });
  });
});

describe('social sign-in state', () => {
  it('shows nothing at all when the person backs out of the sheet', async () => {
    const port = makePort({
      signInWithGoogle: jest.fn(async () => {
        throw new AuthOperationError('cancelled');
      }),
    });
    const viewModel = mountViewModel(port);

    await act(async () => {
      await viewModel().signInWithGoogle();
    });

    expect(viewModel().google.status).toBe('idle');
    expect(viewModel().google.errorKind).toBeNull();
  });

  it('reports a real provider failure on its own button', async () => {
    const port = makePort({
      signInWithGoogle: jest.fn(async () => {
        throw new AuthOperationError('play-services-unavailable');
      }),
    });
    const viewModel = mountViewModel(port);

    await act(async () => {
      await viewModel().signInWithGoogle();
    });

    expect(viewModel().google.status).toBe('error');
    expect(viewModel().google.errorKind).toBe('play-services-unavailable');
    expect(viewModel().login.status).toBe('idle');
  });

  it('passes the trimmed name straight to the port', async () => {
    const signInAnonymously = jest.fn(async () => undefined);
    const viewModel = mountViewModel(makePort({ signInAnonymously }));

    await act(async () => {
      await viewModel().signInAnonymously('Gustavo');
    });

    expect(signInAnonymously).toHaveBeenCalledWith('Gustavo');
    expect(viewModel().anonymous.status).toBe('idle');
  });

  it('drops a stale provider error when the gate changes screens', async () => {
    const port = makePort({
      signInWithGoogle: jest.fn(async () => {
        throw new AuthOperationError('play-services-unavailable');
      }),
    });
    const viewModel = mountViewModel(port);

    await act(async () => {
      await viewModel().signInWithGoogle();
    });

    expect(viewModel().google.status).toBe('error');

    await act(async () => {
      viewModel().resetProviderErrors();
    });

    expect(viewModel().google.status).toBe('idle');
    expect(viewModel().google.errorKind).toBeNull();
    expect(viewModel().anonymous.status).toBe('idle');
  });
});
