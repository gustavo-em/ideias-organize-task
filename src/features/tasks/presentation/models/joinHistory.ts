import type { ListMember } from '../../domain/TaskList';
import type { AppLanguage } from '../localization/taskCopy';
import { CALENDAR_NAMES } from './dateLabel';

/** How many entries the sheet shows: enough to answer "who came in lately"
 * without the section growing past the sheet it lives in. */
export const JOIN_HISTORY_LIMIT = 10;

export interface JoinHistoryEntry {
  member: ListMember;
  /** Local date and time of entry, or null for somebody recorded before the
   * moment was kept — the row shows a dash instead. */
  when: string | null;
}

export interface JoinHistory {
  entries: readonly JoinHistoryEntry[];
  /** How many people are in the history in total, before the cut. */
  total: number;
  truncated: boolean;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Absolute local moment, never a relative count: "12 de mar, 14:05".
 *
 * Written by hand from the app's own month names, the same reason
 * `formatDayLabel` does it: `Intl` is missing on some of the engines this app
 * ships to, and there it silently answers in English instead of failing — a
 * Portuguese screen would read an English date and never notice. The dash is
 * kept for the one thing it means: no moment recorded at all.
 */
export function formatJoinedAt(
  joinedAtMs: number | undefined,
  language: AppLanguage,
): string | null {
  if (joinedAtMs == null || !Number.isFinite(joinedAtMs) || joinedAtMs <= 0) {
    return null;
  }

  const date = new Date(joinedAtMs);
  if (Number.isNaN(date.getTime())) return null;

  const names = CALENDAR_NAMES[language] ?? CALENDAR_NAMES['pt-BR'];
  const month = names.months[date.getMonth()].slice(0, 3);
  const day = date.getDate();
  const minutes = twoDigits(date.getMinutes());

  if (language === 'en-US') {
    // English reads the clock in halves of the day; Portuguese reads it
    // straight through. Each locale gets its own convention.
    const hours = date.getHours();
    const suffix = hours < 12 ? 'AM' : 'PM';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;

    return `${month} ${day}, ${hour12}:${minutes} ${suffix}`;
  }

  return `${twoDigits(day)} ${month}, ${twoDigits(date.getHours())}:${minutes}`;
}

/**
 * Who joined this project and when, most recent first.
 *
 * Only people who actually accepted are here — a pending invite is somebody
 * who has not come in yet. Entries without a recorded moment sit at the end,
 * in their stored order, because there is nothing to sort them by.
 */
export function joinHistory(
  members: readonly ListMember[],
  language: AppLanguage,
): JoinHistory {
  const joined = members.filter(member => member.joined);
  const dated = joined
    .filter(member => member.joinedAtMs != null)
    .sort((a, b) => (b.joinedAtMs ?? 0) - (a.joinedAtMs ?? 0));
  const undated = joined.filter(member => member.joinedAtMs == null);
  const ordered = [...dated, ...undated];

  return {
    entries: ordered.slice(0, JOIN_HISTORY_LIMIT).map(member => ({
      member,
      when: formatJoinedAt(member.joinedAtMs, language),
    })),
    total: ordered.length,
    truncated: ordered.length > JOIN_HISTORY_LIMIT,
  };
}
