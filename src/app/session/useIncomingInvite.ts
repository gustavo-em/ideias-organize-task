import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { parseInviteToken } from '../../features/tasks/domain/TaskList';

/**
 * An invite link tapped outside the app.
 *
 * Covers both ways a link arrives: the app was closed and the link started it
 * (`getInitialURL`), or it was already running in the background and the link
 * brought it forward (the `url` event). Both give the same answer — a token —
 * and the screen that knows what to do with one takes it from here.
 *
 * The token is held until whoever consumes it says so. Between the link
 * landing and the invite sheet opening there is a sign-in to get through on a
 * device with no account, and dropping it in the meantime is how somebody ends
 * up inside the app with no idea what the link was for.
 */
export function useIncomingInvite() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const take = (url: string | null | undefined) => {
      if (!active || url == null) return;

      const found = parseInviteToken(url);
      // A link this app does not recognise is somebody else's business — the
      // OAuth callbacks come through here too.
      if (found != null) setToken(found);
    };

    Linking.getInitialURL()
      .then(take)
      .catch(() => {
        // No opening link is the ordinary case, not a failure.
      });

    const subscription = Linking.addEventListener('url', event =>
      take(event.url),
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const clear = useCallback(() => setToken(null), []);

  return { token, clear };
}
