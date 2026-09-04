/**
 * What one person took for today, inside one shared project.
 *
 * The trio lives in each person's own workspace, not in the project, so what
 * someone brought to a shared day cannot be derived from the synced tasks —
 * it has to be published on its own, per member and per day. This record is
 * the whole of it: which tasks, and nothing about how that person is doing.
 * Weight, points, level and personal streak never leave the device.
 */
export interface SharedMemberDay {
  personId: string;
  /** The publishing device's local day, `YYYY-MM-DD`. */
  dayKey: string;
  taskIds: readonly string[];
  /** Reserved for live presence, which this slice does not publish. */
  focusTaskId: string | null;
  updatedAtMs: number;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** The local day a moment belongs to. Takes the moment as an argument so
 * every caller stays testable — nothing here reads the clock. */
export function dayKeyOf(atMs: number): string {
  const date = new Date(atMs);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

/** The day before a key, as a key. Pure string arithmetic on the local
 * calendar, so a group streak never depends on the current time. */
export function previousDayKey(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  )
    return dayKey;

  const previous = new Date(year, month - 1, day - 1);

  return dayKeyOf(previous.getTime());
}

/** Remote data, treated as unknown until proven otherwise. A record that
 * cannot be read is dropped instead of showing up as a wrong day. */
export function sanitizeMemberDay(value: unknown): SharedMemberDay | null {
  if (typeof value !== 'object' || value === null) return null;

  const candidate = value as Partial<Record<keyof SharedMemberDay, unknown>>;
  const personId =
    typeof candidate.personId === 'string' ? candidate.personId : null;
  const dayKey = typeof candidate.dayKey === 'string' ? candidate.dayKey : null;

  if (personId == null || dayKey == null) return null;

  return {
    personId,
    dayKey,
    taskIds: Array.isArray(candidate.taskIds)
      ? candidate.taskIds.filter((id): id is string => typeof id === 'string')
      : [],
    focusTaskId:
      typeof candidate.focusTaskId === 'string' ? candidate.focusTaskId : null,
    updatedAtMs:
      typeof candidate.updatedAtMs === 'number' &&
      Number.isFinite(candidate.updatedAtMs)
        ? candidate.updatedAtMs
        : 0,
  };
}

export function sanitizeMemberDays(value: unknown): readonly SharedMemberDay[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(sanitizeMemberDay)
    .filter((day): day is SharedMemberDay => day != null);
}
