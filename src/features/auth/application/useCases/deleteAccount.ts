import { AuthOperationError, type AuthErrorKind } from '../../domain/AuthError';
import { ProfileOperationError } from '../../domain/ProfileError';
import type { AuthPort } from '../ports/AuthPort';
import type { ProfilePort } from '../ports/ProfilePort';

/**
 * Erasing an account, in the only order that works.
 *
 * Everything this account wrote is authorized by the session that is about to
 * stop existing: the profile, the handle it holds, the workspace copy, the
 * push tokens, the row it has inside other people's projects. All of it has to
 * go while the account is still there to authorize it — the account itself is
 * the last thing erased, and the device is cleared only once the provider has
 * confirmed there is nothing left to come back to.
 *
 * The proof of identity comes before any of it, not after: Firebase refuses to
 * delete on a session older than a few minutes, and finding that out after the
 * data is gone would leave somebody with an empty account they cannot close.
 */
export interface DeleteAccountInput {
  auth: Pick<
    AuthPort,
    'requiresRecentLogin' | 'reauthenticate' | 'deleteAccount'
  >;
  profile: Pick<ProfilePort, 'deleteAccountData'>;
  uid: string;
  /** The handle the profile holds, so its reservation is released with it.
   * Null when the profile was never read; the adapter then looks it up. */
  handle: string | null;
  /** Typed by the person on the way in. E-mail accounts need it; every other
   * provider proves itself with its own sheet and ignores this. */
  password?: string;
  /**
   * Takes the account out of every shared project this device knows about:
   * the projects it owns come down, the ones it merely belongs to lose its
   * row. Best effort by design — a project that refuses to let go is not a
   * reason to keep an account the person asked to erase.
   */
  detachSharedProjects: () => Promise<void>;
  /** Everything this account wrote on this device. */
  clearLocalData: () => Promise<void>;
}

export type DeleteAccountResult =
  /** The account is gone and so is its data, here and on the server. */
  | { status: 'deleted' }
  /** The person backed out of the provider's own sheet. Not a failure, and no
   * screen says anything about it. */
  | { status: 'cancelled' }
  /** Nothing was deleted: the session has to be proven again first. `kind`
   * says why, so a wrong password reads differently from a stale session. */
  | { status: 'needs-proof'; kind: AuthErrorKind }
  | { status: 'failed'; kind: AuthErrorKind };

function authErrorKind(error: unknown): AuthErrorKind {
  if (error instanceof AuthOperationError) return error.kind;

  return 'unknown';
}

function dataErrorKind(error: unknown): AuthErrorKind {
  // The data layer has its own vocabulary; only one of its words means
  // something different to a person than "it did not work".
  if (error instanceof ProfileOperationError && error.kind === 'network') {
    return 'network';
  }

  return 'unknown';
}

export async function deleteAccount(
  input: DeleteAccountInput,
): Promise<DeleteAccountResult> {
  if (input.auth.requiresRecentLogin()) {
    try {
      await input.auth.reauthenticate(input.password);
    } catch (error) {
      const kind = authErrorKind(error);

      if (kind === 'cancelled') return { status: 'cancelled' };
      // A missing or wrong password, and a session Firebase still will not
      // trust, are all the same answer to the person: prove it again.
      if (kind === 'invalid-credential' || kind === 'requires-recent-login') {
        return { status: 'needs-proof', kind };
      }

      return { status: 'failed', kind };
    }
  }

  await input.detachSharedProjects().catch(() => undefined);

  try {
    await input.profile.deleteAccountData(input.uid, input.handle);
  } catch (error) {
    // The account stays: erasing it now would leave the profile and the
    // handle standing with nobody able to reach them ever again.
    return { status: 'failed', kind: dataErrorKind(error) };
  }

  try {
    await input.auth.deleteAccount();
  } catch (error) {
    const kind = authErrorKind(error);

    if (kind === 'requires-recent-login') {
      return { status: 'needs-proof', kind };
    }

    return { status: 'failed', kind };
  }

  await input.clearLocalData();

  return { status: 'deleted' };
}
