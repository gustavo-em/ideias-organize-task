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

async function idToken(): Promise<string> {
  const user = getAuth(getApp()).currentUser;
  if (user == null) throw new ShareOperationError('forbidden');

  try {
    return await user.getIdToken();
  } catch {
    throw new ShareOperationError('network');
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
): Promise<{ status: number; fields: Record<string, unknown> | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const token = await idToken();
    const query =
      options.updateMask == null
        ? ''
        : `?${options.updateMask
            .map(field => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
            .join('&')}`;

    const response = await fetch(`${BASE_URL}/${path}${query}`, {
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

    if (response.status === 404) return { status: 404, fields: null };
    if (response.status === 403) throw new ShareOperationError('forbidden');
    if (!response.ok) throw new ShareOperationError('unknown');

    const body = (await response.json()) as {
      fields?: Record<string, FirestoreValue>;
    };

    return {
      status: response.status,
      fields: body.fields == null ? {} : fromFirestoreFields(body.fields),
    };
  } catch (error) {
    if (error instanceof ShareOperationError) throw error;
    throw new ShareOperationError('network');
  } finally {
    clearTimeout(timeout);
  }
}
