/** The only two things the rest of the app is allowed to know about who is
 * signed in. Nothing here comes from a specific auth provider's SDK shape. */
export interface AuthUser {
  uid: string;
  email: string | null;
  /** Set by the provider's own profile, if the person ever gave one. */
  displayName: string | null;
  /** The photo the provider already has for this account — a Google account
   * usually does. Shown as the avatar until the person uploads another one. */
  photoURL: string | null;
  /** True for an account created with nothing but a name: it lives on this
   * device until it is linked to a provider, and it has no email to show. */
  isAnonymous: boolean;
}
