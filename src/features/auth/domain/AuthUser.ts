/** The only two things the rest of the app is allowed to know about who is
 * signed in. Nothing here comes from a specific auth provider's SDK shape. */
export interface AuthUser {
  uid: string;
  email: string | null;
  /** Set by the provider's own profile, if the person ever gave one. */
  displayName: string | null;
}
