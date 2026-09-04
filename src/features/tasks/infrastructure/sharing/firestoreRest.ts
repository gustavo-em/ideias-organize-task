import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';

import { ShareOperationError } from '../../domain/ShareError';

/**
 * The project already configured for Firebase Auth (see
 * `android/app/google-services.json`). Cloud Firestore must be enabled for it
 * in the Firebase console, and `docs/firebase/firestore.rules` published,
 * before any of these calls can succeed — neither of those is something this
 * file can do on its own.
 */
const PROJECT_ID = 'ideiasorganizetask';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const REQUEST_TIMEOUT_MS = 10000;

/** Untyped by design: this is Firestore's own wire format, converted at the
 * edge so nothing above this file has to know it exists. */
export type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    return {
      mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) },
    };
  }

  return { nullValue: null };
}

export function toFirestoreFields(
  value: Record<string, unknown>,
): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};

  for (const key of Object.keys(value)) {
    fields[key] = toFirestoreValue(value[key]);
  }

  return fields;
}

export function fromFirestoreValue(value: FirestoreValue | undefined): unknown {
  if (value == null) return null;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  }
  if ('mapValue' in value) {
    return fromFirestoreFields(value.mapValue.fields ?? {});
  }

  return null;
}

export function fromFirestoreFields(
  fields: Record<string, FirestoreValue>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(fields)) {
    result[key] = fromFirestoreValue(fields[key]);
  }

  return result;
}

/** The session's own token, the way every call out of this app authenticates.
 * Exported so the avatar upload speaks to Storage with the same session,
 * without a second copy of this rule anywhere. */
export async function firebaseIdToken(forceRefresh = false): Promise<string> {
  return idToken(forceRefresh);
}

async function idToken(forceRefresh = false): Promise<string> {
  const user = getAuth(getApp()).currentUser;
  if (user == null) throw new ShareOperationError('forbidden');

  try {
    return await user.getIdToken(forceRefresh);
  } catch {
    throw new ShareOperationError('network');
  }
}

export type FirestoreRestErrorKind =
  | 'precondition-failed'
  /** The session itself was refused: the token is missing or past its time. */
  | 'unauthenticated'
  /** The session is fine and a security rule said no. */
  | 'forbidden'
  | 'network'
  | 'unknown';

/** Transport-level failure of a commit, in terms the caller's own feature can
 * translate — this file never decides what a failed precondition means to a
 * user. */
export class FirestoreRestError extends Error {
  constructor(readonly kind: FirestoreRestErrorKind) {
    super(kind);
    this.name = 'FirestoreRestError';
  }
}

export type FirestoreWrite =
  | {
      kind: 'update';
      path: string;
      fields: Record<string, unknown>;
      /** Already in Firestore's wire format, merged over `fields`: for a
       * write that has to hand back values it read without understanding
       * them. */
      rawFields?: Record<string, FirestoreValue>;
      updateMask?: readonly string[];
      /** `false` refuses to overwrite an existing document — how a handle is
       * reserved without a read-then-write race. */
      requireExists?: boolean;
      /** The `updateTime` the document had when it was read: the write lands
       * only if nobody else touched it in between, so a read-modify-write of
       * one field can never swallow somebody else's change. */
      requireUpdateTime?: string;
    }
  | { kind: 'delete'; path: string; requireExists?: boolean };

function documentName(path: string): string {
  return `projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
}

function toCommitWrite(write: FirestoreWrite): Record<string, unknown> {
  const updateTime =
    write.kind === 'update' ? write.requireUpdateTime : undefined;
  const precondition =
    updateTime != null
      ? { currentDocument: { updateTime } }
      : write.requireExists == null
      ? {}
      : { currentDocument: { exists: write.requireExists } };

  if (write.kind === 'delete') {
    return { delete: documentName(write.path), ...precondition };
  }

  return {
    update: {
      name: documentName(write.path),
      fields: { ...toFirestoreFields(write.fields), ...write.rawFields },
    },
    ...(write.updateMask == null
      ? {}
      : { updateMask: { fieldPaths: [...write.updateMask] } }),
    ...precondition,
  };
}

/**
 * All writes or none: Firestore applies a `:commit` body atomically, which is
 * what makes "take this handle and release the old one" a single step instead
 * of a window where somebody owns two names or none.
 */
export async function firestoreCommit(
  writes: readonly FirestoreWrite[],
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const body = JSON.stringify({ writes: writes.map(toCommitWrite) });
    const send = async (forceRefresh: boolean) => {
      const token = await idToken(forceRefresh);

      return fetch(`${BASE_URL}:commit`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      });
    };

    // A cached id token expires after an hour; one silent refresh is the
    // difference between a write that works and asking somebody to log in
    // again for no reason.
    let response = await send(false);
    if (response.status === 401) response = await send(true);

    if (response.ok) return;
    if (response.status === 401) {
      throw new FirestoreRestError('unauthenticated');
    }
    if (response.status === 403) throw new FirestoreRestError('forbidden');

    // The server is the only authority on a refused precondition, and it says
    // so by name — a 400 for any other reason (a malformed write, a rule the
    // document does not satisfy) is not the same story and must not be told
    // as one.
    const failure = await response.json().catch(() => null);
    const status =
      typeof failure === 'object' && failure !== null
        ? (failure as { error?: { status?: unknown } }).error?.status
        : null;

    if (status === 'FAILED_PRECONDITION' || status === 'ALREADY_EXISTS') {
      throw new FirestoreRestError('precondition-failed');
    }

    throw new FirestoreRestError('unknown');
  } catch (error) {
    if (error instanceof FirestoreRestError) throw error;
    if (error instanceof ShareOperationError) {
      // The only `forbidden` this path can raise is "there is no session",
      // which is about the account, not about a rule.
      throw new FirestoreRestError(
        error.kind === 'forbidden' ? 'unauthenticated' : 'network',
      );
    }
    throw new FirestoreRestError('network');
  } finally {
    clearTimeout(timeout);
  }
}

interface FirestoreRequestOptions {
  method?: 'GET' | 'PATCH' | 'DELETE';
  fields?: Record<string, unknown>;
  /** Only these top-level keys are written; everything else on the document
   * is left as it is. */
  updateMask?: readonly string[];
}

/** One authenticated call to a single document, with the timeout and error
 * mapping every gateway method shares. `path` is relative, e.g.
 * `sharedLists/7k2xazjm`. */
export async function firestoreDocument(
  path: string,
  options: FirestoreRequestOptions = {},
): Promise<{
  status: number;
  fields: Record<string, unknown> | null;
  /** Server timestamp of the read, to hand back as a write precondition. */
  updateTime: string | null;
  /** The document's own fields, untouched, for a write that must preserve
   * entries this app does not understand. */
  rawFields: Record<string, FirestoreValue> | null;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const query =
      options.updateMask == null
        ? ''
        : `?${options.updateMask
            .map(field => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
            .join('&')}`;

    const send = async (forceRefresh: boolean) => {
      const token = await idToken(forceRefresh);

      return fetch(`${BASE_URL}/${path}${query}`, {
        method: options.method ?? 'GET',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body:
          options.fields == null
            ? undefined
            : JSON.stringify({ fields: toFirestoreFields(options.fields) }),
      });
    };

    // Same silent refresh as the commit path: an expired cached token is not
    // something to hand back to the person as an error.
    let response = await send(false);
    if (response.status === 401) response = await send(true);

    if (response.status === 404) {
      return { status: 404, fields: null, updateTime: null, rawFields: null };
    }
    if (response.status === 403) throw new ShareOperationError('forbidden');
    if (!response.ok) throw new ShareOperationError('unknown');

    const body = (await response.json()) as {
      fields?: Record<string, FirestoreValue>;
      updateTime?: string;
    };

    return {
      status: response.status,
      fields: body.fields == null ? {} : fromFirestoreFields(body.fields),
      updateTime: body.updateTime ?? null,
      rawFields: body.fields ?? null,
    };
  } catch (error) {
    if (error instanceof ShareOperationError) throw error;
    throw new ShareOperationError('network');
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * The ids of every document in one collection, following Firestore's own
 * paging until the last page.
 *
 * Only the names are asked for (`mask.fieldPaths=__name__`), because the one
 * caller — erasing an account — needs the paths to delete and nothing that is
 * written inside them. A collection nobody ever wrote to answers 200 with no
 * `documents` at all, which is an empty list here and not a failure.
 */
export async function firestoreCollectionIds(
  path: string,
): Promise<readonly string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const ids: string[] = [];
    let pageToken: string | null = null;

    do {
      const query = `?mask.fieldPaths=__name__&pageSize=300${
        pageToken == null ? '' : `&pageToken=${encodeURIComponent(pageToken)}`
      }`;

      const send = async (forceRefresh: boolean) => {
        const token = await idToken(forceRefresh);

        return fetch(`${BASE_URL}/${path}${query}`, {
          method: 'GET',
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
      };

      let response = await send(false);
      if (response.status === 401) response = await send(true);

      if (response.status === 404) return ids;
      if (response.status === 403) throw new FirestoreRestError('forbidden');
      if (!response.ok) throw new FirestoreRestError('unknown');

      const body = (await response.json()) as {
        documents?: { name?: string }[];
        nextPageToken?: string;
      };

      for (const document of body.documents ?? []) {
        const name = document.name;
        if (name == null) continue;

        const id = name.slice(name.lastIndexOf('/') + 1);
        if (id.length > 0) ids.push(id);
      }

      pageToken = body.nextPageToken ?? null;
    } while (pageToken != null);

    return ids;
  } catch (error) {
    if (error instanceof FirestoreRestError) throw error;
    if (error instanceof ShareOperationError) {
      throw new FirestoreRestError(
        error.kind === 'forbidden' ? 'unauthenticated' : 'network',
      );
    }
    throw new FirestoreRestError('network');
  } finally {
    clearTimeout(timeout);
  }
}
