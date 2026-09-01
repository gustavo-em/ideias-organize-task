import type { AuthUser } from '../../domain/AuthUser';

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
  /** Fires once with the current user (or null) and again on every change.
   * Returns the unsubscribe function. */
  onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void;
}
