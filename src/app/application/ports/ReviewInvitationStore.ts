import type { ReviewInvitationState } from '../../domain/ReviewInvitation';

/** Where the count of closed tasks and the last time somebody was asked live.
 * It belongs to the device, not to the account: the store's own prompt has a
 * quota per device, and that is what this is pacing. */
export interface ReviewInvitationStore {
  load(): Promise<ReviewInvitationState | null>;
  save(state: ReviewInvitationState): Promise<void>;
}
