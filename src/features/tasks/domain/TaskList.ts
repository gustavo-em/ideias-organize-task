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

export interface TaskList {
  id: string;
  name: string;
  color: ListColor;
  icon: ProjectIcon;
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
    });
  }

  // The inbox is where anything without a list goes, so it is never optional.
  if (!seen.has(INBOX_LIST_ID)) lists.unshift(DEFAULT_LISTS[0]);

  return lists;
}
