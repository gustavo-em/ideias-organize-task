/**
 * Asks the platform to show its own rating prompt.
 *
 * The app decides the moment; the platform decides whether to show anything at
 * all and how often, which is what the store's rules require of it.
 */
export interface AppReviewPrompter {
  /** Resolves false when the platform had nowhere to show the prompt. */
  requestReview(): Promise<boolean>;
}
