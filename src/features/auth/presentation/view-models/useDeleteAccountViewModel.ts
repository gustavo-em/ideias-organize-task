import { useCallback, useMemo, useState } from 'react';

import {
  deleteAccount,
  type DeleteAccountResult,
} from '../../application/useCases/deleteAccount';
import type { AuthPort } from '../../application/ports/AuthPort';
import type { ProfilePort } from '../../application/ports/ProfilePort';
import type { AuthCopy } from '../localization/authCopy';

interface DeleteAccountViewModelInput {
  authPort: AuthPort;
  profilePort: ProfilePort;
  copy: AuthCopy;
  /** Null with nobody signed in: the row that opens this never exists then. */
  uid: string | null;
  /** The handle the profile holds, so the reservation goes with the account. */
  handle: string | null;
  detachSharedProjects: () => Promise<void>;
  clearLocalData: () => Promise<void>;
}

export interface DeleteAccountViewModel {
  /** True while the dialog is on screen. */
  isOpen: boolean;
  /** True while the deletion is running: the dialog stays, disabled. */
  isDeleting: boolean;
  /** True once Firebase asked for the account to be proven again. */
  needsProof: boolean;
  /** True when proving it means typing a password rather than a provider
   * sheet. */
  asksForPassword: boolean;
  error: string | null;
  open: () => void;
  cancel: () => void;
  confirm: (password: string) => Promise<void>;
}

/**
 * The account's last screen, held together.
 *
 * The use case decides what happens; this decides what the person sees while
 * it does. A session Firebase no longer trusts is the one outcome that is not
 * an error: the dialog swaps to asking for the sign-in again and the same
 * button carries on from there.
 */
export function useDeleteAccountViewModel({
  authPort,
  profilePort,
  copy,
  uid,
  handle,
  detachSharedProjects,
  clearLocalData,
}: DeleteAccountViewModelInput): DeleteAccountViewModel {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [needsProof, setNeedsProof] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asksForPassword = useMemo(
    () => isOpen && authPort.accountProvider() === 'password',
    // The provider cannot change while one account is signed in, so this is
    // read once per opening rather than on every keystroke.
    [authPort, isOpen],
  );

  const open = useCallback(() => {
    setNeedsProof(false);
    setError(null);
    setIsOpen(true);
  }, []);

  const cancel = useCallback(() => {
    if (isDeleting) return;

    setIsOpen(false);
    setNeedsProof(false);
    setError(null);
  }, [isDeleting]);

  const confirm = useCallback(
    async (password: string) => {
      if (uid == null || isDeleting) return;

      setIsDeleting(true);
      setError(null);

      let result: DeleteAccountResult;

      try {
        result = await deleteAccount({
          auth: authPort,
          profile: profilePort,
          uid,
          handle,
          password,
          detachSharedProjects,
          clearLocalData,
        });
      } finally {
        setIsDeleting(false);
      }

      if (result.status === 'deleted') {
        // Firebase reports the empty session on its own and the shell goes
        // back to the entrance; closing the dialog is all that is left.
        setIsOpen(false);
        setNeedsProof(false);
        return;
      }

      if (result.status === 'cancelled') return;

      if (result.status === 'needs-proof') {
        setNeedsProof(true);
        // A first ask is not a failure yet: the message only appears once an
        // attempt with a password behind it came back refused.
        setError(
          result.kind === 'invalid-credential' && password.length > 0
            ? copy.errors['invalid-credential']
            : null,
        );
        return;
      }

      setError(copy.errors[result.kind]);
    },
    [
      authPort,
      clearLocalData,
      copy,
      detachSharedProjects,
      handle,
      isDeleting,
      profilePort,
      uid,
    ],
  );

  return {
    isOpen,
    isDeleting,
    needsProof,
    asksForPassword,
    error,
    open,
    cancel,
    confirm,
  };
}
