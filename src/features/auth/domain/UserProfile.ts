/**
 * Who someone is inside the app, in the only two things anyone else sees: a
 * display name and a unique handle. The e-mail an account was created with is
 * never part of this — it is a way in, not a name.
 */
export interface UserProfile {
  uid: string;
  displayName: string;
  /** Lowercase, 3-20 chars, letters, digits and `_`. Unique app-wide. */
  handle: string;
}

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;
export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

export const DISPLAY_NAME_MAX_LENGTH = 40;

export type HandleIssue = 'too-short' | 'too-long' | 'invalid-chars';

/** What a field is allowed to hold while it is being typed: lowercase and
 * trimmed, so the person never has to notice the rule to obey it. */
export function normalizeHandle(input: string): string {
  return input.trim().toLowerCase();
}

/** The rule broken, or null when the handle is usable. Order matters: length
 * is reported before shape, so "ab" reads as too short and not as invalid. */
export function validateHandle(input: string): HandleIssue | null {
  const handle = normalizeHandle(input);

  if (handle.length < HANDLE_MIN_LENGTH) return 'too-short';
  if (handle.length > HANDLE_MAX_LENGTH) return 'too-long';
  if (!HANDLE_PATTERN.test(handle)) return 'invalid-chars';

  return null;
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Only ever a starting point: whatever comes out of here lands in a field the
 * person can rewrite. `uid` is the tail used to make a short or empty name
 * usable, never a secret — it is already the person's own id. */
export function suggestHandle(displayName: string, uid: string): string {
  const base = stripAccents(displayName)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');

  const tail = uid.toLowerCase().replace(/[^a-z0-9]/g, '');
  const seed = base.length === 0 ? `pessoa_${tail}` : base;
  const padded = seed.length < HANDLE_MIN_LENGTH ? `${seed}_${tail}` : seed;

  return padded.slice(0, HANDLE_MAX_LENGTH).replace(/_+$/g, '') || 'pessoa';
}

/** Next try after the suggested one is already taken: keeps the readable part
 * and appends a short, stable-ish suffix without ever passing the limit. */
export function nextHandleCandidate(handle: string, suffix: string): string {
  const clean = suffix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 4);
  const tail = clean.length === 0 ? '1' : clean;
  const room = HANDLE_MAX_LENGTH - tail.length - 1;
  const base = handle.slice(0, Math.max(HANDLE_MIN_LENGTH, room));

  return `${base}_${tail}`.slice(0, HANDLE_MAX_LENGTH);
}
