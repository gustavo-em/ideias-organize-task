import { DAY_MS, daysBetween, startOfDay } from './Day';

/** One day's worth of finished work, kept so the week chart has something
 * honest to draw. */
export interface DayRecord {
  dayMs: number;
  /** Sum of the weight of everything finished that day. */
  weight: number;
  completed: number;
  trioClosed: boolean;
}

export interface ProgressState {
  points: number;
  streakDays: number;
  /** The last day whose trio was closed. The streak counts these, not days the
   * app was opened: opening an app is not an achievement. */
  lastTrioDayMs: number;
  /** Oldest first, capped so storage cannot grow without end. */
  days: readonly DayRecord[];
}

export const EMPTY_PROGRESS: ProgressState = {
  points: 0,
  streakDays: 0,
  lastTrioDayMs: 0,
  days: [],
};

/** Four weeks is everything the charts and the streak ever look at. */
const HISTORY_DAYS = 28;

/** What closing the whole trio adds on top of the three tasks themselves. It
 * is the only bonus in the app, and it is the reason to finish the third one. */
export const TRIO_BONUS_POINTS = 20;

const LEVEL_BASE = 100;
const LEVEL_GROWTH = 60;

/** Points needed to have reached a level. Level 1 starts at zero. */
export function pointsForLevel(level: number): number {
  if (level <= 1) return 0;

  let total = 0;

  for (let step = 1; step < level; step += 1) {
    total += LEVEL_BASE + (step - 1) * LEVEL_GROWTH;
  }

  return total;
}

export function getLevel(points: number): number {
  let level = 1;

  while (pointsForLevel(level + 1) <= points) {
    level += 1;
  }

  return level;
}

export interface LevelProgress {
  level: number;
  /** Points earned inside the current level. */
  intoLevel: number;
  /** What the current level costs in total. */
  levelSpan: number;
}

export function getLevelProgress(points: number): LevelProgress {
  const level = getLevel(points);
  const floor = pointsForLevel(level);
  const ceiling = pointsForLevel(level + 1);

  return {
    level,
    intoLevel: points - floor,
    levelSpan: ceiling - floor,
  };
}

function withDay(
  progress: ProgressState,
  atMs: number,
  change: (record: DayRecord) => DayRecord,
): readonly DayRecord[] {
  const dayMs = startOfDay(atMs);
  const existing = progress.days.find(record => record.dayMs === dayMs);
  const updated = change(
    existing ?? { dayMs, weight: 0, completed: 0, trioClosed: false },
  );
  const days =
    existing == null
      ? [...progress.days, updated]
      : progress.days.map(record =>
          record.dayMs === dayMs ? updated : record,
        );

  return days
    .filter(record => record.dayMs > dayMs - HISTORY_DAYS * DAY_MS)
    .sort((first, second) => first.dayMs - second.dayMs);
}

export function recordCompletion(
  progress: ProgressState,
  weight: number,
  atMs: number,
): ProgressState {
  return {
    ...progress,
    points: progress.points + weight,
    days: withDay(progress, atMs, record => ({
      ...record,
      weight: record.weight + weight,
      completed: record.completed + 1,
    })),
  };
}

/**
 * Undoing a completion.
 *
 * Reopening gives the points back rather than keeping them: a checkbox tapped
 * by accident should cost nothing, and points that survive an undo are points
 * that can be farmed.
 */
export function recordReopen(
  progress: ProgressState,
  weight: number,
  atMs: number,
): ProgressState {
  return {
    ...progress,
    points: Math.max(0, progress.points - weight),
    days: withDay(progress, atMs, record => ({
      ...record,
      weight: Math.max(0, record.weight - weight),
      completed: Math.max(0, record.completed - 1),
    })),
  };
}

/**
 * A day where all three were finished.
 *
 * The streak grows when yesterday also closed, holds when the same day closes
 * twice, and starts over after a gap.
 */
export function recordTrioClosed(
  progress: ProgressState,
  atMs: number,
): ProgressState {
  const today = startOfDay(atMs);

  if (progress.lastTrioDayMs === today) return progress;

  const gap =
    progress.lastTrioDayMs === 0
      ? Number.POSITIVE_INFINITY
      : daysBetween(progress.lastTrioDayMs, today);

  return {
    ...progress,
    points: progress.points + TRIO_BONUS_POINTS,
    streakDays: gap === 1 ? progress.streakDays + 1 : 1,
    lastTrioDayMs: today,
    days: withDay(progress, atMs, record => ({ ...record, trioClosed: true })),
  };
}

/** A streak only survives while it is fed: it is stale the day after the last
 * closed trio, so the number on screen is never a lie. */
export function getStreakDays(progress: ProgressState, nowMs: number): number {
  if (progress.lastTrioDayMs === 0) return 0;

  return daysBetween(progress.lastTrioDayMs, nowMs) <= 1
    ? progress.streakDays
    : 0;
}

/** The last seven days, oldest first, with empty days filled in so the chart
 * keeps its shape at the start of the week. */
export function getWeek(
  progress: ProgressState,
  nowMs: number,
): readonly DayRecord[] {
  const today = startOfDay(nowMs);
  const byDay = new Map(progress.days.map(record => [record.dayMs, record]));
  const week: DayRecord[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const dayMs = today - offset * DAY_MS;

    week.push(
      byDay.get(dayMs) ?? { dayMs, weight: 0, completed: 0, trioClosed: false },
    );
  }

  return week;
}

export function getTrioCount(progress: ProgressState): number {
  return progress.days.filter(record => record.trioClosed).length;
}

export function sanitizeProgress(value: unknown): ProgressState {
  if (typeof value !== 'object' || value === null) return EMPTY_PROGRESS;

  const candidate = value as Partial<Record<keyof ProgressState, unknown>>;
  const days = Array.isArray(candidate.days)
    ? candidate.days
        .filter(
          (record): record is DayRecord =>
            typeof record === 'object' &&
            record !== null &&
            typeof (record as DayRecord).dayMs === 'number',
        )
        .map(record => ({
          dayMs: startOfDay(record.dayMs),
          weight: Number.isFinite(record.weight)
            ? Math.max(0, record.weight)
            : 0,
          completed: Number.isFinite(record.completed)
            ? Math.max(0, record.completed)
            : 0,
          trioClosed: record.trioClosed === true,
        }))
        .sort((first, second) => first.dayMs - second.dayMs)
        .slice(-HISTORY_DAYS)
    : [];

  return {
    points:
      typeof candidate.points === 'number' && Number.isFinite(candidate.points)
        ? Math.max(0, Math.round(candidate.points))
        : 0,
    streakDays:
      typeof candidate.streakDays === 'number' &&
      Number.isFinite(candidate.streakDays)
        ? Math.max(0, Math.round(candidate.streakDays))
        : 0,
    lastTrioDayMs:
      typeof candidate.lastTrioDayMs === 'number' &&
      Number.isFinite(candidate.lastTrioDayMs)
        ? startOfDay(candidate.lastTrioDayMs)
        : 0,
    days,
  };
}
