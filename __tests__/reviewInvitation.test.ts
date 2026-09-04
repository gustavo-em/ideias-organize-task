import {
  EMPTY_REVIEW_INVITATION,
  recordDeclined,
  recordInvitationShown,
  recordRated,
  recordTaskCompleted,
  sanitizeReviewInvitation,
  shouldInviteReview,
} from '../src/app/domain/ReviewInvitation';

const NOW = 1_700_000_000_000;
const A_WEEK = 7 * 24 * 60 * 60 * 1000;

function afterCompleting(count: number) {
  let state = EMPTY_REVIEW_INVITATION;
  for (let index = 0; index < count; index += 1) {
    state = recordTaskCompleted(state);
  }

  return state;
}

describe('review invitation', () => {
  it('says nothing until three tasks have been closed', () => {
    expect(shouldInviteReview(afterCompleting(0), NOW)).toBe(false);
    expect(shouldInviteReview(afterCompleting(2), NOW)).toBe(false);
    expect(shouldInviteReview(afterCompleting(3), NOW)).toBe(true);
  });

  it('waits a week before asking a second time', () => {
    const asked = recordInvitationShown(afterCompleting(3), NOW);

    expect(shouldInviteReview(asked, NOW + A_WEEK - 1)).toBe(false);
    expect(shouldInviteReview(asked, NOW + A_WEEK)).toBe(true);
  });

  it('never asks again once somebody has rated', () => {
    const rated = recordRated(afterCompleting(20));

    expect(shouldInviteReview(rated, NOW + A_WEEK * 10)).toBe(false);
  });

  it('never asks again once somebody has said no', () => {
    const declined = recordDeclined(afterCompleting(20));

    expect(shouldInviteReview(declined, NOW + A_WEEK * 10)).toBe(false);
  });

  it('starts over when the stored state is malformed', () => {
    expect(sanitizeReviewInvitation('nonsense')).toEqual(
      EMPTY_REVIEW_INVITATION,
    );
    expect(sanitizeReviewInvitation({ completed: -3 }).completed).toBe(0);
    expect(sanitizeReviewInvitation({ hasRated: 'yes' }).hasRated).toBe(false);
  });

  it('keeps what a valid stored state says', () => {
    const stored = {
      completed: 7,
      lastAskedAtMs: NOW,
      hasRated: false,
      hasDeclined: false,
    };

    expect(sanitizeReviewInvitation(stored)).toEqual(stored);
  });
});
