export interface ReviewInvitationState {
  /** Tasks closed on this device since the app was installed. */
  completed: number;
  /** When the person was last asked, so nobody is asked twice in a week. */
  lastAskedAtMs: number;
  /** Set once they have been sent to the store, which ends the asking. */
  hasRated: boolean;
  /** Set when they ask not to be bothered again. */
  hasDeclined: boolean;
}

export const EMPTY_REVIEW_INVITATION: ReviewInvitationState = {
  completed: 0,
  lastAskedAtMs: 0,
  hasRated: false,
  hasDeclined: false,
};

/**
 * How much has to go right before the app asks what somebody thinks of it.
 *
 * Three closed tasks: enough that the app has done its job at least once, and
 * few enough that the question still arrives while the day is going well. One
 * would be asking a stranger, and a stranger's rating is the one most likely
 * to be a shrug.
 *
 * Once asked, a week has to pass before it is asked again — the fastest way to
 * earn one star is to interrupt somebody twice.
 */
const TASKS_BEFORE_ASKING = 3;
const ASK_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function recordTaskCompleted(
  state: ReviewInvitationState,
): ReviewInvitationState {
  return { ...state, completed: state.completed + 1 };
}

export function shouldInviteReview(
  state: ReviewInvitationState,
  nowMs: number,
): boolean {
  if (state.hasRated || state.hasDeclined) return false;
  if (state.completed < TASKS_BEFORE_ASKING) return false;

  return nowMs - state.lastAskedAtMs >= ASK_AGAIN_AFTER_MS;
}

export function recordInvitationShown(
  state: ReviewInvitationState,
  nowMs: number,
): ReviewInvitationState {
  return { ...state, lastAskedAtMs: nowMs };
}

export function recordRated(
  state: ReviewInvitationState,
): ReviewInvitationState {
  return { ...state, hasRated: true };
}

export function recordDeclined(
  state: ReviewInvitationState,
): ReviewInvitationState {
  return { ...state, hasDeclined: true };
}

/** Stored state is untrusted input, so anything malformed starts over. */
export function sanitizeReviewInvitation(
  stored: unknown,
): ReviewInvitationState {
  if (stored == null || typeof stored !== 'object') {
    return EMPTY_REVIEW_INVITATION;
  }

  const value = stored as Partial<ReviewInvitationState>;

  return {
    completed:
      typeof value.completed === 'number' && value.completed >= 0
        ? Math.floor(value.completed)
        : 0,
    lastAskedAtMs:
      typeof value.lastAskedAtMs === 'number' && value.lastAskedAtMs >= 0
        ? value.lastAskedAtMs
        : 0,
    hasRated: value.hasRated === true,
    hasDeclined: value.hasDeclined === true,
  };
}
