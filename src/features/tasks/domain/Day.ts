export const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight of the day a moment belongs to, in the device's own time zone. */
export function startOfDay(atMs: number): number {
  const date = new Date(atMs);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** The last millisecond of that day, which is what a date with no time means:
 * "some time today" is not late until today is over. */
export function endOfDay(atMs: number): number {
  const date = new Date(atMs);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function isSameDay(firstMs: number, secondMs: number): boolean {
  return startOfDay(firstMs) === startOfDay(secondMs);
}

/** Whole days between two moments, counted from midnight to midnight so a gap
 * of a few hours across midnight still reads as one day. */
export function daysBetween(fromMs: number, toMs: number): number {
  return Math.round((startOfDay(toMs) - startOfDay(fromMs)) / DAY_MS);
}
