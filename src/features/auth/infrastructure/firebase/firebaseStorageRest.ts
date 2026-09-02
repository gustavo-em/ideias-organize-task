import { getApp } from '@react-native-firebase/app';

import { firebaseIdToken } from '../../../tasks/infrastructure/sharing/firestoreRest';
import { AvatarOperationError } from '../../domain/AvatarError';

/** One object per account, always the same path: a new photo replaces the old
 * one instead of piling versions up in the bucket. */
export function avatarPathFor(uid: string): string {
  return `avatars/${uid}.jpg`;
}

function bucket(): string {
  const name = getApp().options.storageBucket;
  // No bucket in the app's own config means Storage was never enabled for
  // this project: the same tratado error as a missing bucket on the server.
  if (name == null || name.length === 0) {
    throw new AvatarOperationError('storage-unavailable');
  }

  return name;
}

function objectUrl(name: string, query: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket()}/o/${encodeURIComponent(
    name,
  )}${query}`;
}

function failureFor(status: number): AvatarOperationError {
  // 404 is the bucket that does not exist yet; 403/401 is a rule or a session
  // saying no. Anything else is treated as a trip that did not complete.
  if (status === 404) return new AvatarOperationError('storage-unavailable');
  if (status === 401 || status === 403) {
    return new AvatarOperationError('forbidden');
  }

  return new AvatarOperationError('network');
}

async function authorization(): Promise<string> {
  try {
    return `Bearer ${await firebaseIdToken()}`;
  } catch {
    throw new AvatarOperationError('forbidden');
  }
}

/**
 * Sends the already resized JPEG to `avatars/{uid}.jpg` and answers with the
 * URL anything showing the person can load. The download token in that URL is
 * what makes the image loadable by an `Image` without headers; it only ever
 * travels inside documents a member can read.
 */
export async function uploadAvatar(uid: string, uri: string): Promise<string> {
  const token = await authorization();
  const name = avatarPathFor(uid);

  let body: Blob;
  try {
    const file = await fetch(uri);
    body = await file.blob();
  } catch {
    throw new AvatarOperationError('network');
  }

  let response: Response;
  try {
    response = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${bucket()}/o?uploadType=media&name=${encodeURIComponent(
        name,
      )}`,
      {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'image/jpeg' },
        body,
      },
    );
  } catch (error) {
    if (error instanceof AvatarOperationError) throw error;
    throw new AvatarOperationError('network');
  }

  if (!response.ok) throw failureFor(response.status);

  let downloadToken: string | null = null;
  let storedName = name;
  try {
    const payload = (await response.json()) as {
      downloadTokens?: unknown;
      name?: unknown;
    };
    downloadToken =
      typeof payload.downloadTokens === 'string'
        ? payload.downloadTokens.split(',')[0]
        : null;
    if (typeof payload.name === 'string' && payload.name.length > 0) {
      storedName = payload.name;
    }
  } catch {
    downloadToken = null;
  }

  // The object is already in the bucket: an answer without a download token
  // is still a stored photo, and the URL is built from the object itself.
  // Loading it then depends on the read rule, which every signed-in member
  // passes.
  return objectUrl(
    storedName,
    downloadToken == null ? '?alt=media' : `?alt=media&token=${downloadToken}`,
  );
}

/** Takes the photo out of the bucket. An object that is already gone is not a
 * failure: the point is that nothing is left behind. */
export async function deleteAvatar(uid: string): Promise<void> {
  const token = await authorization();

  let response: Response;
  try {
    response = await fetch(objectUrl(avatarPathFor(uid), ''), {
      method: 'DELETE',
      headers: { Authorization: token },
    });
  } catch (error) {
    if (error instanceof AvatarOperationError) throw error;
    throw new AvatarOperationError('network');
  }

  if (response.ok || response.status === 404) return;

  throw failureFor(response.status);
}
