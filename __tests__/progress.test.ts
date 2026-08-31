import { DAY_MS } from '../src/features/tasks/domain/Day';
import {
  EMPTY_PROGRESS,
  getLevel,
  getLevelProgress,
  getStreakDays,
  getTrioCount,
  getWeek,
  pointsForLevel,
  recordCompletion,
  recordReopen,
  recordTrioClosed,
  sanitizeProgress,
  TRIO_BONUS_POINTS,
} from '../src/features/tasks/domain/Progress';

const now = new Date(2026, 7, 25, 9, 0).getTime();

describe('progress', () => {
  it('adds the weight of what was finished, not one per task', () => {
    const after = recordCompletion(
      recordCompletion(EMPTY_PROGRESS, 25, now),
      5,
      now,
    );

    expect(after.points).toBe(30);
    expect(after.days[0].completed).toBe(2);
    expect(after.days[0].weight).toBe(30);
  });

  it('gives the points back when a task is reopened', () => {
    const done = recordCompletion(EMPTY_PROGRESS, 12, now);
    const undone = recordReopen(done, 12, now);

    expect(undone.points).toBe(0);
    expect(undone.days[0].weight).toBe(0);
    expect(undone.days[0].completed).toBe(0);
  });

  it('never falls below zero on an undo it did not see the start of', () => {
    expect(recordReopen(EMPTY_PROGRESS, 25, now).points).toBe(0);
  });

  it('counts a streak of days with the trio closed', () => {
    const first = recordTrioClosed(EMPTY_PROGRESS, now);
    const second = recordTrioClosed(first, now + DAY_MS);
    const afterGap = recordTrioClosed(second, now + 4 * DAY_MS);

    expect(first.streakDays).toBe(1);
    expect(second.streakDays).toBe(2);
    expect(afterGap.streakDays).toBe(1);
    expect(second.points).toBe(TRIO_BONUS_POINTS * 2);
  });

  it('closes a day only once', () => {
    const first = recordTrioClosed(EMPTY_PROGRESS, now);

    expect(recordTrioClosed(first, now + 3600000)).toBe(first);
  });

  it('lets a streak go stale the day after it was last fed', () => {
    const closed = recordTrioClosed(EMPTY_PROGRESS, now);

    expect(getStreakDays(closed, now)).toBe(1);
    expect(getStreakDays(closed, now + DAY_MS)).toBe(1);
    expect(getStreakDays(closed, now + 2 * DAY_MS)).toBe(0);
  });

  it('grows the cost of each level', () => {
    expect(pointsForLevel(1)).toBe(0);
    expect(pointsForLevel(2)).toBe(100);
    expect(pointsForLevel(3)).toBe(260);
    expect(getLevel(0)).toBe(1);
    expect(getLevel(100)).toBe(2);
    expect(getLevel(259)).toBe(2);
    expect(getLevelProgress(120)).toEqual({
      level: 2,
      intoLevel: 20,
      levelSpan: 160,
    });
  });

  it('fills the week with the days that had nothing', () => {
    const week = getWeek(recordCompletion(EMPTY_PROGRESS, 12, now), now);

    expect(week).toHaveLength(7);
    expect(week[6].weight).toBe(12);
    expect(week[0].weight).toBe(0);
  });

  it('counts the days that closed', () => {
    const closed = recordTrioClosed(
      recordTrioClosed(EMPTY_PROGRESS, now),
      now + DAY_MS,
    );

    expect(getTrioCount(closed)).toBe(2);
  });

  it('reads stored progress defensively', () => {
    expect(sanitizeProgress('nonsense')).toEqual(EMPTY_PROGRESS);
    expect(
      sanitizeProgress({ points: -4, streakDays: 2.6, days: [{ dayMs: now }] }),
    ).toMatchObject({ points: 0, streakDays: 3 });
  });
});
