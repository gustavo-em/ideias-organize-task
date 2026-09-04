import type { AuthPort } from '../src/features/auth/application/ports/AuthPort';
import type { ProfilePort } from '../src/features/auth/application/ports/ProfilePort';
import {
  deleteAccount,
  type DeleteAccountInput,
} from '../src/features/auth/application/useCases/deleteAccount';
import { AuthOperationError } from '../src/features/auth/domain/AuthError';
import { ProfileOperationError } from '../src/features/auth/domain/ProfileError';

/** What the account did, in the order it happened: the order is the design,
 * so it is what the tests read. */
function makeInput(
  overrides: {
    auth?: Partial<
      Pick<AuthPort, 'requiresRecentLogin' | 'reauthenticate' | 'deleteAccount'>
    >;
    profile?: Partial<Pick<ProfilePort, 'deleteAccountData'>>;
    detachSharedProjects?: () => Promise<void>;
    clearLocalData?: () => Promise<void>;
    password?: string;
  } = {},
): { input: DeleteAccountInput; steps: string[] } {
  const steps: string[] = [];

  const input: DeleteAccountInput = {
    auth: {
      requiresRecentLogin: overrides.auth?.requiresRecentLogin ?? (() => false),
      reauthenticate:
        overrides.auth?.reauthenticate ??
        (async () => {
          steps.push('reauthenticate');
        }),
      deleteAccount:
        overrides.auth?.deleteAccount ??
        (async () => {
          steps.push('delete-account');
        }),
    },
    profile: {
      deleteAccountData:
        overrides.profile?.deleteAccountData ??
        (async () => {
          steps.push('delete-data');
        }),
    },
    uid: 'u1',
    handle: 'gustavo',
    password: overrides.password,
    detachSharedProjects:
      overrides.detachSharedProjects ??
      (async () => {
        steps.push('detach-projects');
      }),
    clearLocalData:
      overrides.clearLocalData ??
      (async () => {
        steps.push('clear-local');
      }),
  };

  return { input, steps };
}

describe('erasing an account', () => {
  it('empties the account before erasing it, and the device only after', async () => {
    const { input, steps } = makeInput();

    const result = await deleteAccount(input);

    expect(result).toEqual({ status: 'deleted' });
    // Everything the server holds is authorized by the session that is about
    // to stop existing, so it cannot run after the account is gone.
    expect(steps).toEqual([
      'detach-projects',
      'delete-data',
      'delete-account',
      'clear-local',
    ]);
  });

  it('proves the account first when the session is too old to be trusted', async () => {
    const { input, steps } = makeInput({
      auth: { requiresRecentLogin: () => true },
    });

    await deleteAccount(input);

    expect(steps[0]).toBe('reauthenticate');
  });

  it('keeps the account and its data when the person backs out of the sheet', async () => {
    const { input, steps } = makeInput({
      auth: {
        requiresRecentLogin: () => true,
        reauthenticate: async () => {
          throw new AuthOperationError('cancelled');
        },
      },
    });

    const result = await deleteAccount(input);

    expect(result).toEqual({ status: 'cancelled' });
    expect(steps).toEqual([]);
  });

  it('asks again, deleting nothing, when the password does not check out', async () => {
    const { input, steps } = makeInput({
      password: 'wrong',
      auth: {
        requiresRecentLogin: () => true,
        reauthenticate: async () => {
          throw new AuthOperationError('invalid-credential');
        },
      },
    });

    const result = await deleteAccount(input);

    expect(result).toEqual({
      status: 'needs-proof',
      kind: 'invalid-credential',
    });
    expect(steps).toEqual([]);
  });

  it('leaves the account standing when its data could not be erased', async () => {
    const { input, steps } = makeInput({
      profile: {
        deleteAccountData: async () => {
          throw new ProfileOperationError('network');
        },
      },
    });

    const result = await deleteAccount(input);

    // Erasing the account now would strand the profile and the handle with
    // nobody able to reach either one again.
    expect(result).toEqual({ status: 'failed', kind: 'network' });
    expect(steps).not.toContain('delete-account');
    expect(steps).not.toContain('clear-local');
  });

  it('carries on when a shared project refuses to let go', async () => {
    const { input, steps } = makeInput({
      detachSharedProjects: async () => {
        throw new Error('403');
      },
    });

    const result = await deleteAccount(input);

    expect(result).toEqual({ status: 'deleted' });
    expect(steps).toEqual(['delete-data', 'delete-account', 'clear-local']);
  });

  it('asks for the sign-in again when Firebase refuses the delete itself', async () => {
    const { input, steps } = makeInput({
      auth: {
        deleteAccount: async () => {
          throw new AuthOperationError('requires-recent-login');
        },
      },
    });

    const result = await deleteAccount(input);

    expect(result).toEqual({
      status: 'needs-proof',
      kind: 'requires-recent-login',
    });
    // The device keeps what it has: an account that still exists is still an
    // account to sign into.
    expect(steps).not.toContain('clear-local');
  });

  it('never asks an anonymous account to prove anything', async () => {
    const requiresRecentLogin = jest.fn(() => false);
    const reauthenticate = jest.fn(async () => undefined);
    const { input } = makeInput({
      auth: { requiresRecentLogin, reauthenticate },
    });

    await deleteAccount(input);

    expect(reauthenticate).not.toHaveBeenCalled();
  });
});
