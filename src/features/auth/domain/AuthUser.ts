/** The only two things the rest of the app is allowed to know about who is
 * signed in. Nothing here comes from a specific auth provider's SDK shape. */
export interface AuthUser {
  uid: string;
  email: string | null;
}
