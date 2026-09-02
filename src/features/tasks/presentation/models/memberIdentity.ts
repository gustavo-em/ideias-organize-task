import { isAddressLikeName } from '../../domain/TaskList';

/** Only what a screen may show about somebody: the handle is null until it is
 * confirmed as theirs. */
export interface VisibleProfile {
  displayName: string;
  handle: string | null;
  /** The avatar, when the account has one. Null means initials. */
  photoURL?: string | null;
}

export interface MemberIdentity {
  name: string;
  /** Null only while the profile has not been read or reserved yet. */
  handle: string | null;
  /** What the other members see as this person's photo. */
  photoURL: string | null;
}

/**
 * What a signed-in account is called inside a shared project.
 *
 * The e-mail an account signs in with is never part of this: nobody hands
 * their address to the other people in a project just to be recognised. The
 * profile's own display name and handle are the identity; the provider's name
 * covers the moment before the profile has been read, and the label only the
 * case of an account with no name at all.
 */
export function deriveMemberIdentity(
  profile: VisibleProfile | null,
  /** The name the provider already knows, used while the profile has not been
   * read — never an e-mail, always a name somebody chose. */
  providerName: string | null,
  fallback: string,
  /** The photo the provider already knows, used while the profile has not
   * been read. */
  providerPhotoURL: string | null = null,
): MemberIdentity {
  const photoURL = profile?.photoURL ?? providerPhotoURL ?? null;
  const fromProfile = profile?.displayName.trim();
  if (fromProfile != null && fromProfile.length > 0) {
    return { name: fromProfile, handle: profile?.handle ?? null, photoURL };
  }

  const fromProvider = providerName?.trim();

  return {
    name:
      fromProvider != null && fromProvider.length > 0 ? fromProvider : fallback,
    handle: profile?.handle ?? null,
    photoURL,
  };
}

/** What is safe to print for somebody stored in a project.
 *
 * A project shared before profiles existed can still carry a name derived
 * from an e-mail address — the whole address, or the part before the `@`,
 * plus-tag and all. Neither is a name and neither is ever shown: the handle
 * takes over, and the neutral label covers the rest. */
export function memberDisplayName(
  member: { name: string; handle: string | null },
  fallback: string,
): string {
  const name = member.name.trim();

  if (name.length > 0 && !isAddressLikeName(name)) return name;
  if (member.handle != null) return `@${member.handle}`;

  return fallback;
}
