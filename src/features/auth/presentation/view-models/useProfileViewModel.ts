import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AvatarPort } from '../../application/ports/AvatarPort';
import type { ProfilePort } from '../../application/ports/ProfilePort';
import {
  AvatarOperationError,
  type AvatarErrorKind,
} from '../../domain/AvatarError';
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
export type AvatarStatus = 'idle' | 'working';

export interface ProfileViewModel {
  /** What the sheet starts from: the stored profile, or the suggestion made
   * for an account that has none yet. */
  profile: UserProfile | null;
  /** True only when the handle above came back from the server, meaning it is
   * reserved for this account. A suggestion is never published as identity. */
  reserved: boolean;
  /** The profile as other people may see it: the handle is present only once
   * it is actually this account's. */
  visibleProfile: {
    displayName: string;
    handle: string | null;
    photoURL: string | null;
  } | null;
  status: ProfileStatus;
  errorKind: ProfileErrorKind | null;
  save: (displayName: string, handle: string) => Promise<boolean>;
  dismissSaved: () => void;
  /** The avatar side of the sheet: choosing a photo saves it on its own, with
   * no relation to the Salvar button of the name and handle. */
  avatarStatus: AvatarStatus;
  avatarErrorKind: AvatarErrorKind | null;
  changeAvatar: () => Promise<void>;
  removeAvatar: () => Promise<void>;
}

/** Whatever went wrong with a photo, in the terms the sheet speaks: the
 * bucket's own answers pass through, and a profile that refused the field is
 * a refusal too — never a promise that retrying fixes it. */
function avatarKindOf(error: unknown): AvatarErrorKind {
  if (error instanceof AvatarOperationError) return error.kind;
  if (error instanceof ProfileOperationError) {
    return error.kind === 'forbidden' ? 'forbidden' : 'network';
  }

  return 'network';
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
  avatarPort,
  user,
  fallbackName,
}: {
  profilePort: ProfilePort;
  /** Gallery and bucket. Left out, the sheet simply has no photo actions. */
  avatarPort?: AvatarPort;
  user: AuthUser | null;
  /** Used only when an account reaches here with no name at all. */
  fallbackName: string;
}): ProfileViewModel {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reserved, setReserved] = useState(false);
  const [status, setStatus] = useState<ProfileStatus>('idle');
  const [errorKind, setErrorKind] = useState<ProfileErrorKind | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<AvatarStatus>('idle');
  const [avatarErrorKind, setAvatarErrorKind] =
    useState<AvatarErrorKind | null>(null);
  const bootstrappedFor = useRef<string | null>(null);

  // The session's own two values, not the object holding them: a new object
  // with the same uid must not restart the bootstrap and cancel the one
  // already in flight.
  const uid = user?.uid ?? null;
  const providerName = user?.displayName ?? null;
  // A Google account already carries a photo: it is on screen from the first
  // frame, and the stored one replaces it as soon as the profile is read.
  const providerPhotoURL = user?.photoURL ?? null;

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
      photoURL: providerPhotoURL,
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
            photoURL: providerPhotoURL,
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
            photoURL: providerPhotoURL,
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
  }, [fallbackName, profilePort, providerName, providerPhotoURL, uid]);

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
          // Carried through, never rewritten here: saving a name must not
          // blank a photo the person already has.
          photoURL: profile?.photoURL ?? providerPhotoURL,
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
    [profile, profilePort, providerPhotoURL, reserved, user],
  );

  // The photo is its own little transaction: gallery, bucket, then the field
  // in the profile. A refusal anywhere leaves the avatar exactly as it was.
  const changeAvatar = useCallback(async () => {
    if (avatarPort == null || uid == null) return;

    setAvatarStatus('working');
    setAvatarErrorKind(null);
    try {
      const uploaded = await avatarPort.pickAndUpload(uid);
      if (uploaded == null) return;

      // The photo only counts once the profile took it: a field that did not
      // land would show an avatar this session and nothing at all in the
      // next one, with nobody else ever seeing it.
      await profilePort.savePhotoURL(uid, uploaded);
      setProfile(current =>
        current == null ? current : { ...current, photoURL: uploaded },
      );
    } catch (error) {
      setAvatarErrorKind(avatarKindOf(error));
    } finally {
      setAvatarStatus('idle');
    }
  }, [avatarPort, profilePort, uid]);

  const removeAvatar = useCallback(async () => {
    if (avatarPort == null || uid == null) return;

    setAvatarStatus('working');
    setAvatarErrorKind(null);
    try {
      await avatarPort.remove(uid);
      await profilePort.savePhotoURL(uid, null);
      // With the uploaded photo gone, a Google account falls back to the
      // photo the provider has; anything else falls back to the initials.
      setProfile(current =>
        current == null
          ? current
          : { ...current, photoURL: providerPhotoURL ?? null },
      );
    } catch (error) {
      setAvatarErrorKind(avatarKindOf(error));
    } finally {
      setAvatarStatus('idle');
    }
  }, [avatarPort, profilePort, providerPhotoURL, uid]);

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
            photoURL: profile.photoURL,
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
    avatarStatus,
    avatarErrorKind,
    changeAvatar,
    removeAvatar,
  };
}
