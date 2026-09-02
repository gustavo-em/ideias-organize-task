export const listColors = ['sun', 'grape', 'mint', 'coral', 'ocean'] as const;

export type ListColor = (typeof listColors)[number];

export const projectIcons = [
  'layers',
  'home',
  'briefcase',
  'plane',
  'book',
  'heart',
  'cart',
  'wallet',
  'dumbbell',
  'bulb',
  'calendar',
  'inbox',
] as const;

export type ProjectIcon = (typeof projectIcons)[number];
export const DEFAULT_PROJECT_ICON: ProjectIcon = 'layers';

export const listRoles = ['owner', 'editor', 'viewer'] as const;
export type ListRole = (typeof listRoles)[number];

export interface ListMember {
  personId: string;
  /** Short display name; initials are derived from it. */
  name: string;
  /** The unique handle the person chose, shown next to the name. Null for a
   * member recorded before handles existed. */
  handle: string | null;
  role: ListRole;
  /** Invite accepted or still pending. */
  joined: boolean;
  /** When the invite was accepted, in local epoch milliseconds. Absent for
   * anybody recorded before this was kept: the history shows a dash rather
   * than a date nobody wrote down. */
  joinedAtMs?: number;
}

export interface ListShare {
  /** Public suffix of the link: ideias.app/p/<token>. */
  token: string;
  /** What whoever opens the link receives. */
  invitedAs: Exclude<ListRole, 'owner'>;
  members: readonly ListMember[];
}

export interface TaskList {
  id: string;
  name: string;
  color: ListColor;
  icon: ProjectIcon;
  /** Absent means the project is only yours. */
  share?: ListShare;
}

/** The link a person pastes into "Entrar com convite". */
export const SHARE_LINK_HOST = 'ideias.app/p/';

export function buildInviteLink(token: string): string {
  return `${SHARE_LINK_HOST}${token}`;
}

/** Accepts a bare token or a full link and reads the token out of it. Never
 * throws: a broken paste is `null`, for the sheet to show as an error. */
export function parseInviteToken(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const withoutQuery = trimmed.split(/[?#]/)[0];
  const token = withoutQuery.includes('/')
    ? withoutQuery.split('/').filter(Boolean).pop() ?? ''
    : withoutQuery;

  return /^[a-z0-9]{4,24}$/i.test(token) ? token : null;
}

/** A project is shared once someone other than its creator is in it — a link
 * that nobody has opened yet is not a group. */
export function isShared(list: TaskList): boolean {
  return list.share != null && list.share.members.length > 1;
}

/** The Caixa is one person's inbox; sharing it would not mean anything. */
export function canShare(list: TaskList): boolean {
  return list.id !== INBOX_LIST_ID;
}

/** Without a `share`, the local owner can do everything. With one, only
 * `owner` and `editor` change anything. */
export function canEdit(list: TaskList, personId: string): boolean {
  if (list.share == null) return true;

  const member = list.share.members.find(
    candidate => candidate.personId === personId,
  );

  return (
    member != null && (member.role === 'owner' || member.role === 'editor')
  );
}

/** Whether a stored member name is really an e-mail address, or the local
 * part of one with its plus tag (`tester+share5`) — what the app derived from
 * accounts before profiles existed. Both have no spaces; a name somebody
 * typed, like `Ana + Bia`, does, and stays a name. */
export function isAddressLikeName(name: string): boolean {
  const trimmed = name.trim();

  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ||
    /^[^\s@+]+\+[^\s@+]+$/.test(trimmed)
  );
}

export function memberInitials(name: string): string {
  const cleaned = stripAccents(name).trim();
  if (cleaned.length === 0) return '?';

  const parts = cleaned.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : cleaned.slice(0, 2);

  return initials.toUpperCase();
}

/** Adds a member, or replaces the one with the same id. Never mutates. */
export function withMember(list: TaskList, member: ListMember): TaskList {
  if (list.share == null) return list;

  const exists = list.share.members.some(
    candidate => candidate.personId === member.personId,
  );
  const members = exists
    ? list.share.members.map(candidate =>
        candidate.personId === member.personId ? member : candidate,
      )
    : [...list.share.members, member];

  return { ...list, share: { ...list.share, members } };
}

export function withoutMember(list: TaskList, personId: string): TaskList {
  if (list.share == null) return list;

  return {
    ...list,
    share: {
      ...list.share,
      members: list.share.members.filter(
        candidate => candidate.personId !== personId,
      ),
    },
  };
}

/** Where a captured task lands when nothing said otherwise. */
export const INBOX_LIST_ID = 'inbox';

export const DEFAULT_LISTS: readonly TaskList[] = [
  { id: INBOX_LIST_ID, name: 'Caixa', color: 'sun', icon: 'inbox' },
];

const ACCENTS: Record<string, string> = {
  á: 'a',
  à: 'a',
  ã: 'a',
  â: 'a',
  ä: 'a',
  é: 'e',
  ê: 'e',
  è: 'e',
  ë: 'e',
  í: 'i',
  ì: 'i',
  î: 'i',
  ï: 'i',
  ó: 'o',
  õ: 'o',
  ô: 'o',
  ò: 'o',
  ö: 'o',
  ú: 'u',
  ù: 'u',
  û: 'u',
  ü: 'u',
  ç: 'c',
  ñ: 'n',
};

/** Built from the table itself, so a letter added above is matched here
 * without a second list to keep in step. */
const ACCENTED = new RegExp(`[${Object.keys(ACCENTS).join('')}]`, 'gi');

/**
 * Accents removed by table rather than by `String.prototype.normalize`, which
 * is not available on every JavaScript engine this app runs on.
 */
export function stripAccents(value: string): string {
  return value.replace(ACCENTED, character => {
    const lower = character.toLowerCase();
    const replacement = ACCENTS[lower];

    if (replacement == null) return character;

    return character === lower ? replacement : replacement.toUpperCase();
  });
}

/** A name typed after `#` is matched loosely: case and accents should not
 * decide whether a task lands in an existing list or invents a new one. */
export function normalizeListName(name: string): string {
  return stripAccents(name.trim().toLowerCase());
}

export function findListByName(
  lists: readonly TaskList[],
  name: string | null,
): TaskList | null {
  if (name == null) return null;

  const wanted = normalizeListName(name);

  return lists.find(list => normalizeListName(list.name) === wanted) ?? null;
}

export function findListById(
  lists: readonly TaskList[],
  id: string,
): TaskList | null {
  return lists.find(list => list.id === id) ?? null;
}

/** The colour of the next list to be created, cycling so two lists made in a
 * row never look the same. */
export function nextListColor(lists: readonly TaskList[]): ListColor {
  return listColors[lists.length % listColors.length];
}

export function createList(
  name: string,
  color: ListColor,
  icon: ProjectIcon = DEFAULT_PROJECT_ICON,
): TaskList {
  return {
    id: normalizeListName(name).replace(/\s+/g, '-'),
    name: name.trim(),
    color,
    icon,
  };
}

function sanitizeMember(value: unknown): ListMember | null {
  if (typeof value !== 'object' || value === null) return null;

  const candidate = value as Partial<Record<keyof ListMember, unknown>>;
  const personId =
    typeof candidate.personId === 'string' && candidate.personId.length > 0
      ? candidate.personId
      : null;
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const handle =
    typeof candidate.handle === 'string' && candidate.handle.trim().length > 0
      ? candidate.handle.trim().toLowerCase()
      : null;

  if (personId == null || name.length === 0) return null;

  const joinedAtMs = sanitizeJoinedAtMs(candidate.joinedAtMs);

  return {
    personId,
    name,
    handle,
    role: listRoles.includes(candidate.role as ListRole)
      ? (candidate.role as ListRole)
      : 'viewer',
    joined: candidate.joined === true,
    ...(joinedAtMs == null ? {} : { joinedAtMs }),
  };
}

/** A moment somebody joined, or nothing at all: a broken value is dropped
 * rather than turned into a date the app made up. */
export function sanitizeJoinedAtMs(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

/** Entry from disk is untrusted input, same rigor as the rest of the list:
 * without a valid `token`, `invitedAs` and at least one member, the project
 * goes back to being local rather than becoming a half-formed object. */
function sanitizeShare(value: unknown): ListShare | undefined {
  if (typeof value !== 'object' || value === null) return undefined;

  const candidate = value as Partial<Record<keyof ListShare, unknown>>;
  const token =
    typeof candidate.token === 'string' && candidate.token.length > 0
      ? candidate.token
      : null;
  const invitedAs =
    candidate.invitedAs === 'editor' || candidate.invitedAs === 'viewer'
      ? candidate.invitedAs
      : null;

  if (token == null || invitedAs == null || !Array.isArray(candidate.members)) {
    return undefined;
  }

  const seen = new Set<string>();
  const members: ListMember[] = [];

  for (const entry of candidate.members) {
    const member = sanitizeMember(entry);
    if (member == null || seen.has(member.personId)) continue;

    seen.add(member.personId);
    members.push(member);
  }

  return members.length === 0 ? undefined : { token, invitedAs, members };
}

export function sanitizeLists(value: unknown): TaskList[] {
  if (!Array.isArray(value)) return [...DEFAULT_LISTS];

  const lists: TaskList[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;

    const candidate = entry as Partial<Record<keyof TaskList, unknown>>;
    const id = typeof candidate.id === 'string' ? candidate.id : null;
    const name =
      typeof candidate.name === 'string' ? candidate.name.trim() : '';

    if (id == null || name.length === 0 || seen.has(id)) continue;

    seen.add(id);
    lists.push({
      id,
      name,
      color: listColors.includes(candidate.color as ListColor)
        ? (candidate.color as ListColor)
        : 'sun',
      icon: projectIcons.includes(candidate.icon as ProjectIcon)
        ? (candidate.icon as ProjectIcon)
        : id === INBOX_LIST_ID
        ? 'inbox'
        : DEFAULT_PROJECT_ICON,
      // The Caixa is a single person's inbox; a `share` on it is discarded
      // rather than sanitized, so it can never surface as shareable.
      share: id === INBOX_LIST_ID ? undefined : sanitizeShare(candidate.share),
    });
  }

  // The inbox is where anything without a list goes, so it is never optional.
  if (!seen.has(INBOX_LIST_ID)) lists.unshift(DEFAULT_LISTS[0]);

  return lists;
}
