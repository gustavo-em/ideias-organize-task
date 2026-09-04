import { useCallback, useEffect, useRef, useState } from 'react';

import type { TaskEventBus } from '../../features/tasks/domain/TaskEvent';
import type { ReviewInvitationStore } from '../application/ports/ReviewInvitationStore';
import {
  EMPTY_REVIEW_INVITATION,
  recordDeclined,
  recordInvitationShown,
  recordRated,
  recordTaskCompleted,
  shouldInviteReview,
  type ReviewInvitationState,
} from '../domain/ReviewInvitation';

/**
 * When to ask what somebody thinks of the app.
 *
 * It listens for the one fact that means the app did its job — a task closed —
 * and counts. The rules for how many and how often live in the domain; all
 * this does is hold the count, write it down, and raise the flag.
 *
 * Nothing is asked before the count comes back from storage: a device that has
 * already said "não perguntar de novo" would otherwise be asked again on every
 * cold start, which is the one way to turn a rating prompt into a one-star
 * review.
 */
export function useReviewInvitation(
  bus: TaskEventBus,
  store: ReviewInvitationStore,
) {
  const [isInviting, setIsInviting] = useState(false);
  // Held in a ref as well as in state: the bus listener is registered once and
  // would otherwise keep counting from whatever the state was when it was
  // registered, so the third task would never be the third.
  const state = useRef<ReviewInvitationState>(EMPTY_REVIEW_INVITATION);
  const isRestored = useRef(false);

  const save = useCallback(
    (next: ReviewInvitationState) => {
      state.current = next;
      store.save(next).catch(() => undefined);
    },
    [store],
  );

  useEffect(() => {
    let isCurrent = true;

    store
      .load()
      .then(stored => {
        if (!isCurrent) return;

        if (stored != null) state.current = stored;
        isRestored.current = true;
      })
      .catch(() => {
        if (isCurrent) isRestored.current = true;
      });

    return () => {
      isCurrent = false;
    };
  }, [store]);

  useEffect(
    () =>
      bus.on('task.completed', event => {
        if (!isRestored.current) return;

        // Asking right after something went right is the only honest moment to
        // ask. A reminder is not work finished, so it does not count.
        if (event.task.kind === 'reminder') return;

        const counted = recordTaskCompleted(state.current);

        if (shouldInviteReview(counted, event.at)) {
          save(recordInvitationShown(counted, event.at));
          setIsInviting(true);
        } else {
          save(counted);
        }
      }),
    [bus, save],
  );

  const dismiss = useCallback(() => setIsInviting(false), []);

  const decline = useCallback(() => {
    save(recordDeclined(state.current));
    setIsInviting(false);
  }, [save]);

  const accept = useCallback(() => {
    save(recordRated(state.current));
  }, [save]);

  return { isInviting, accept, decline, dismiss };
}
