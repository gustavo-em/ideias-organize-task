import type { AuthUser } from '../../../auth/domain/AuthUser';

/**
 * What a signed-in account is called inside a shared project.
 *
 * There is no profile screen in this feature on purpose — asking for a name
 * before someone can share a project is exactly the setup friction the
 * research on abandoned to-do apps points at. The provider's own profile
 * name is used if there is one; otherwise the local part of the email reads
 * better than a raw address next to someone's initials.
 */
export function deriveMemberName(user: AuthUser, fallback: string): string {
  if (user.displayName != null && user.displayName.trim().length > 0) {
    return user.displayName.trim();
  }

  const local = user.email?.split('@')[0]?.trim();
  return local != null && local.length > 0 ? local : fallback;
}
