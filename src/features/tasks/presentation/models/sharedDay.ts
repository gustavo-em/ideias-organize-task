import {
  dayKeyOf,
  previousDayKey,
  type SharedMemberDay,
} from '../../domain/SharedMemberDay';
import { isCompleted, isOpen, type Task } from '../../domain/Task';
import type { ListMember } from '../../domain/TaskList';

export type SharedDayState = 'focusing' | 'done' | 'open' | 'absent';

export interface SharedDayEntry {
  member: ListMember;
  /** What the person took for today. Null when `absent`. */
  task: Task | null;
  state: SharedDayState;
}

/** Reading order of the band: who is working, who is holding something, who
 * finished, who has not picked anything yet. */
const ORDER: readonly SharedDayState[] = ['focusing', 'open', 'done', 'absent'];

function pick(
  day: SharedMemberDay,
  tasks: readonly Task[],
): { task: Task | null; state: SharedDayState } | null {
  const taken = day.taskIds
    .map(id => tasks.find(task => task.id === id))
    .filter((task): task is Task => task != null);

  // Took nothing, and said so: that is a row. Took something this device
  // cannot resolve yet — the other person's push has not landed — is not:
  // it goes back to being a member without data, never "took nothing".
  if (taken.length === 0) {
    return day.taskIds.length === 0 ? { task: null, state: 'absent' } : null;
  }

  const focused =
    day.focusTaskId == null
      ? undefined
      : taken.find(task => task.id === day.focusTaskId && isOpen(task));

  if (focused != null) return { task: focused, state: 'focusing' };

  const open = taken.find(isOpen);
  if (open != null) return { task: open, state: 'open' };

  // Everything is closed: the last one closed is the one the row is about.
  const closed = taken
    .filter(isCompleted)
    .reduce<Task | null>(
      (latest, task) =>
        latest == null ||
        (task.completedAtMs ?? 0) >= (latest.completedAtMs ?? 0)
          ? task
          : latest,
      null,
    );

  return closed == null ? null : { task: closed, state: 'done' };
}

/**
 * One line per person, for today only.
 *
 * A member whose day has not arrived from the network is left out of the
 * result entirely — and so is one who published tasks this device has not
 * received yet. Network silence is not the same as "took nothing", and the
 * band never turns one into the other. Someone with a pending invite is
 * left out too: nobody who has not joined agreed to anything.
 *
 * Pure: no clock, no React, no network. The moment comes in as `nowMs`.
 */
export function sharedDay(
  members: readonly ListMember[],
  days: readonly SharedMemberDay[],
  tasks: readonly Task[],
  nowMs: number,
): readonly SharedDayEntry[] {
  const today = dayKeyOf(nowMs);
  const entries: SharedDayEntry[] = [];

  for (const member of members) {
    if (!member.joined) continue;

    const day = days.find(
      candidate =>
        candidate.personId === member.personId && candidate.dayKey === today,
    );
    if (day == null) continue;

    const picked = pick(day, tasks);
    if (picked == null) continue;

    entries.push({ member, task: picked.task, state: picked.state });
  }

  return ORDER.flatMap(state => entries.filter(entry => entry.state === state));
}

/** Everyone who is in the project published a day, and every one of those
 * days is closed. A day nobody can vouch for is not a closed day. */
export function isGroupDayClosed(
  members: readonly ListMember[],
  entries: readonly SharedDayEntry[],
): boolean {
  const joined = members.filter(member => member.joined).length;

  return (
    joined > 0 &&
    entries.length === joined &&
    entries.every(entry => entry.state === 'done')
  );
}

/** Days in a row where everybody closed what they took. Local to this device,
 * because it is derived from what this device could see. */
export interface GroupStreak {
  lastDayKey: string | null;
  days: number;
}

export const EMPTY_GROUP_STREAK: GroupStreak = { lastDayKey: null, days: 0 };

/**
 * Moves a group streak forward.
 *
 * A day that is not closed leaves the count untouched instead of zeroing it:
 * losing a long run is the single most common reason people drop a streak
 * app for good, and this band is not a scoreboard to be punished by.
 */
export function advanceGroupStreak(
  streak: GroupStreak,
  dayKey: string,
  closed: boolean,
): GroupStreak {
  if (!closed || streak.lastDayKey === dayKey) return streak;

  return {
    lastDayKey: dayKey,
    days: streak.lastDayKey === previousDayKey(dayKey) ? streak.days + 1 : 1,
  };
}

export function sanitizeGroupStreak(value: unknown): GroupStreak {
  if (typeof value !== 'object' || value === null) return EMPTY_GROUP_STREAK;

  const candidate = value as Partial<Record<keyof GroupStreak, unknown>>;

  return {
    lastDayKey:
      typeof candidate.lastDayKey === 'string' ? candidate.lastDayKey : null,
    days:
      typeof candidate.days === 'number' && Number.isFinite(candidate.days)
        ? Math.max(0, Math.trunc(candidate.days))
        : 0,
  };
}
