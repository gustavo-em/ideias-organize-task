/**
 * What a space or a group is recognized by.
 *
 * Colour, icon and the loose way names are compared are shared by the two —
 * a group borrows the space's own palette on purpose, so the app never grows
 * a second set of colours meaning something slightly different. They live
 * here rather than in `TaskList` so that `TaskGroup` can use them without the
 * two files importing each other.
 */
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
  'cake',
  'gift',
  'tools',
  'inbox',
] as const;

export type ProjectIcon = (typeof projectIcons)[number];
export const DEFAULT_PROJECT_ICON: ProjectIcon = 'layers';

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
