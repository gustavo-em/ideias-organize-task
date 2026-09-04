import { useEffect, useState } from 'react';

import {
  SHARE_LINK_ORIGIN,
  SHARE_LINK_PATH,
} from '../../../tasks/domain/TaskList';

/** What a stranger may see about a space before there is an account: enough to
 * recognise the invite, never enough to be a copy of the workspace. */
export interface InvitePreview {
  token: string;
  name: string | null;
  invitedBy: string | null;
  memberCount: number;
  openCount: number;
  tasks: readonly { title: string; done: boolean }[];
}

export type InvitePreviewStatus = 'loading' | 'ready' | 'gone';

/** Long enough for a slow connection, short enough that the entrance is not
 * held hostage by one. A preview that does not arrive is not a reason to keep
 * anybody from signing in. */
const TIMEOUT_MS = 6000;

/**
 * Reading an invite before there is an account.
 *
 * The same address the link points at, asked as data. It answers without a
 * session because the function behind it reads with the Admin SDK — which is
 * the whole reason somebody can see what they were invited to before deciding
 * whether to sign up for it.
 */
export function useInvitePreview(token: string | null) {
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [status, setStatus] = useState<InvitePreviewStatus>('loading');

  useEffect(() => {
    if (token == null) {
      setPreview(null);
      setStatus('loading');
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    fetch(`${SHARE_LINK_ORIGIN}${SHARE_LINK_PATH}${token}?format=json`, {
      signal: controller.signal,
    })
      .then(async response => {
        if (!active) return;

        if (response.status === 404) {
          setStatus('gone');
          return;
        }

        const body = (await response.json()) as InvitePreview;
        setPreview({ ...body, token });
        setStatus('ready');
      })
      .catch(() => {
        // A preview that cannot be fetched is not a dead invite: the token may
        // still be good, and the ways in below it work either way.
        if (active) setStatus('gone');
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [token]);

  return { preview, status };
}
