import type { AuthUser } from '../../domain/AuthUser';

/** How an account proves who it is. `unknown` covers a provider this app does
 * not know: the screen then asks for nothing and lets Firebase decide. */
export type AccountProvider =
  | 'password'
  | 'google'
  | 'apple'
  | 'anonymous'
  | 'unknown';

/**
 * The only shape the presentation layer is allowed to depend on. Whatever
 * signs a user in — Firebase today, anything else later — speaks this
 * contract, so swapping the provider is a change to one adapter file.
 */
export interface AuthPort {
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  /** Google, on both platforms. */
  signInWithGoogle(): Promise<void>;
  /** Apple, iOS only: rejects with `provider-unavailable` anywhere else. */
  signInWithApple(): Promise<void>;
  /** An account with a name and nothing else. The uid it creates is the one a
   * later `linkWithCredential` promotes, so it is never recreated. */
  signInAnonymously(displayName: string): Promise<void>;
  signOut(): Promise<void>;
  /** Which provider this account signs in with, so a screen knows whether
   * proving it is really this person means a password field or a provider
   * sheet. */
  accountProvider(): AccountProvider;
  /** True when Firebase will refuse to erase this account until the person
   * signs in again. Asked before anything is deleted, so the proof is given
   * while there is still an account to prove. */
  requiresRecentLogin(): boolean;
  /** Signs the account already in session in again, in place. `password` is
   * needed by e-mail accounts and ignored by every other provider. Rejects
   * with `cancelled` when the person backs out of the provider's sheet. */
  reauthenticate(password?: string): Promise<void>;
  /** Erases the account at the provider — not the data it wrote, which the
   * caller clears first. Rejects with `requires-recent-login` when the
   * session went stale between the check and here. */
  deleteAccount(): Promise<void>;
  /** Fires once with the current user (or null) and again on every change.
   * Returns the unsubscribe function. */
  onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void;
}
