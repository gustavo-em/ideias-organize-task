import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ProfilePort } from '../../application/ports/ProfilePort';
import {
  ProfileOperationError,
  type ProfileErrorKind,
} from '../../domain/ProfileError';
import type { AuthUser } from '../../domain/AuthUser';
import {
  nextHandleCandidate,
  suggestHandle,
  type UserProfile,
} from '../../domain/UserProfile';

export type ProfileStatus = 'idle' | 'saving' | 'saved';

export interface ProfileViewModel {
  /** What the sheet starts from: the stored profile, or the suggestion made
   * for an account that has none yet. */
  profile: UserProfile | null;
  /** True only when the handle above came back from the server, meaning it is
   * reserved for this account. A suggestion is never published as identity. */
  reserved: boolean;
  /** The profile as other people may see it: the handle is present only once
   * it is actually this account's. */
  visibleProfile: { displayName: string; handle: string | null } | null;
  status: ProfileStatus;
  errorKind: ProfileErrorKind | null;
  save: (displayName: string, handle: string) => Promise<boolean>;
  dismissSaved: () => void;
}

function errorKindOf(error: unknown): ProfileErrorKind {
  return error instanceof ProfileOperationError ? error.kind : 'network';
}

/**
 * The signed-in account's name and handle.
 *
 * Nobody is asked to invent a handle before they can use the app: the first
 * time an account is seen, one is derived from the name it already has and
 * reserved in the background. Everything about it is editable afterwards.
 */
export function useProfileViewModel({
  profilePort,
  user,
  fallbackName,
}: {
  profilePort: ProfilePort;
  user: AuthUser | null;
  /** Used only when an account reaches here with no name at all. */
  fallbackName: string;
}): ProfileViewModel {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reserved, setReserved] = useState(false);
  const [status, setStatus] = useState<ProfileStatus>('idle');
  const [errorKind, setErrorKind] = useState<ProfileErrorKind | null>(null);
  const bootstrappedFor = useRef<string | null>(null);

  // The session's own two values, not the object holding them: a new object
  // with the same uid must not restart the bootstrap and cancel the one
  // already in flight.
  const uid = user?.uid ?? null;
  const providerName = user?.displayName ?? null;

  useEffect(() => {
    if (uid == null) {
      bootstrappedFor.current = null;
      setProfile(null);
      setReserved(false);
      return;
    }

    if (bootstrappedFor.current === uid) return;
    bootstrappedFor.current = uid;

    let cancelled = false;
    const name =
      providerName != null && providerName.trim().length > 0
        ? providerName.trim()
        : fallbackName;
    const suggested: UserProfile = {
      uid,
      displayName: name,
      handle: suggestHandle(name, uid),
    };

    // Nobody ever meets an empty profile screen: the suggestion is on screen
    // from the first frame, and the reservation catches up behind it. Whatever
    // the network answers only ever replaces this, never blanks it.
    setProfile(current => (current?.uid === uid ? current : suggested));
    setReserved(false);

    const bootstrap = async () => {
      try {
        const existing = await profilePort.load(uid);
        if (cancelled) return;

        if (existing != null) {
          setProfile(existing);
          setReserved(true);
          return;
        }

        const wanted = suggested.handle;
        try {
          const created = await profilePort.save({
            uid,
            displayName: name,
            handle: wanted,
            previousHandle: null,
          });
          if (!cancelled) {
            setProfile(created);
            setReserved(true);
          }
        } catch (error) {
          if (errorKindOf(error) !== 'handle-taken') throw error;

          const retried = await profilePort.save({
            uid,
            displayName: name,
            handle: nextHandleCandidate(wanted, uid),
            previousHandle: null,
          });
          if (!cancelled) {
            setProfile(retried);
            setReserved(true);
          }
        }
      } catch {
        // Entering the app never waits on this, and a failed reservation is
        // not a reason to show nobody: the suggestion stays, and saving from
        // the sheet is what tries the reservation again, with a message.
        if (!cancelled)
          setProfile(current => (current?.uid === uid ? current : suggested));
      }
    };

    bootstrap().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [fallbackName, profilePort, providerName, uid]);

  const save = useCallback(
    async (displayName: string, handle: string): Promise<boolean> => {
      if (user == null) return false;

      setStatus('saving');
      setErrorKind(null);
      try {
        const saved = await profilePort.save({
          uid: user.uid,
          displayName,
          handle,
          // A handle that was only ever a suggestion belongs to nobody here:
          // asking to release it would try to delete somebody else's
          // reservation and take the whole save down with it.
          previousHandle: reserved ? profile?.handle ?? null : null,
        });
        setProfile(saved);
        setReserved(true);
        setStatus('saved');
        return true;
      } catch (error) {
        setErrorKind(errorKindOf(error));
        setStatus('idle');
        return false;
      }
    },
    [profile, profilePort, reserved, user],
  );

  const dismissSaved = useCallback(() => {
    setStatus(current => (current === 'saved' ? 'idle' : current));
  }, []);

  // Kept identical between renders: the shared-project subscriptions in the
  // task view model key off this identity, and a new object every render
  // would tear them down and set them up again on every tick.
  const visibleProfile = useMemo(
    () =>
      profile == null
        ? null
        : {
            displayName: profile.displayName,
            handle: reserved ? profile.handle : null,
          },
    [profile, reserved],
  );

  return {
    profile,
    reserved,
    visibleProfile,
    status,
    errorKind,
    save,
    dismissSaved,
  };
}
