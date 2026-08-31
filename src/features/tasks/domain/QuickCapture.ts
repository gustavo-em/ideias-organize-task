import { DAY_MS, endOfDay, startOfDay } from './Day';
import type { TaskPriority } from './Task';
import { stripAccents } from './TaskList';

/**
 * What one line of typing turns into.
 *
 * Capture is the whole product's front door: the research on abandoned task
 * apps puts the threshold at about ten seconds, and a form with five fields
 * never fits in ten seconds. So there is one field, and this file is what
 * reads it.
 */
export interface CapturedDraft {
  title: string;
  priority: TaskPriority;
  dueAtMs: number | null;
  estimatedMinutes: number | null;
  /** The name typed after `#`, still as the person wrote it. Resolving it to
   * an existing list, or creating one, is the application's decision. */
  listName: string | null;
  /** True when a clock time was typed, which is what tells "sexta" (due by the
   * end of Friday) from "sexta 9h" (due at nine). */
  hasTimeOfDay: boolean;
}

export const PRIORITY_WORDS: Record<string, TaskPriority> = {
  alta: 'high',
  urgente: 'high',
  high: 'high',
  p1: 'high',
  media: 'medium',
  normal: 'medium',
  medium: 'medium',
  p2: 'medium',
  baixa: 'low',
  low: 'low',
  depois: 'low',
  p3: 'low',
};

const WEEKDAY_WORDS: Record<string, number> = {
  domingo: 0,
  dom: 0,
  segunda: 1,
  seg: 1,
  'segunda-feira': 1,
  terca: 2,
  ter: 2,
  quarta: 3,
  qua: 3,
  quinta: 4,
  qui: 4,
  sexta: 5,
  sex: 5,
  sabado: 6,
  sab: 6,
};

function removeRange(value: string, start: number, length: number): string {
  return `${value.slice(0, start)} ${value.slice(start + length)}`;
}

function cleanTitle(value: string): string {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  // Only trailing connectors are dropped: one in the middle is part of the
  // sentence ("falar com a Ana"), one at the end is debris ("falar com a").
  const trimmed = collapsed.replace(
    /(?:\s+(?:às|as|à|a|no|na|em|de|do|da|para|pra|pro|até|ate|dia))+$/i,
    '',
  );

  return trimmed.trim();
}

function atTimeOnDay(dayMs: number, hours: number, minutes: number): number {
  const date = new Date(dayMs);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

/** The next day carrying that weekday, today included: someone typing "sexta"
 * on a Friday means today, not a week from now. */
function nextWeekday(nowMs: number, weekday: number): number {
  const today = startOfDay(nowMs);
  const shift = (weekday - new Date(today).getDay() + 7) % 7;

  return today + shift * DAY_MS;
}

interface Extraction {
  rest: string;
  dayMs: number | null;
  hours: number | null;
  minutes: number;
}

/**
 * How people actually say it.
 *
 * `!alta` is a shorthand for someone who has learned the shorthand. Nobody
 * arrives typing punctuation, so the ordinary words carry the same meaning —
 * and the sheet lets the same thing be set by tapping, for anyone who would
 * rather not think about words at all.
 *
 * Longest first, so "sem pressa" is read before "pressa" could be.
 */
const PRIORITY_PHRASES: readonly (readonly [RegExp, TaskPriority])[] = [
  [/(?:^|\s)sem\s+press[ao](?=\s|$)/i, 'low'],
  [/(?:^|\s)sem\s+urg[êe]ncia(?=\s|$)/i, 'low'],
  [/(?:^|\s)quando\s+der(?=\s|$)/i, 'low'],
  [/(?:^|\s)urgente(?=\s|$)/i, 'high'],
  [/(?:^|\s)importante(?=\s|$)/i, 'high'],
];

function extractPriority(input: string): {
  rest: string;
  priority: TaskPriority | null;
} {
  const match = /(?:^|\s)!([\p{L}\p{N}]+)/u.exec(input);

  if (match != null) {
    const word = stripAccents(match[1].toLowerCase());
    const priority = PRIORITY_WORDS[word];

    // An unknown `!word` is left in the title rather than guessed at.
    if (priority != null) {
      return {
        rest: removeRange(input, match.index, match[0].length),
        priority,
      };
    }
  }

  for (const [pattern, priority] of PRIORITY_PHRASES) {
    const phrase = pattern.exec(input);

    if (phrase != null) {
      return {
        rest: removeRange(input, phrase.index, phrase[0].length),
        priority,
      };
    }
  }

  return { rest: input, priority: null };
}

function extractList(input: string): { rest: string; listName: string | null } {
  const match = /(?:^|\s)#([\p{L}\p{N}][\p{L}\p{N}_-]*)/u.exec(input);

  if (match == null) return { rest: input, listName: null };

  return {
    rest: removeRange(input, match.index, match[0].length),
    listName: match[1],
  };
}

function extractEstimate(input: string): {
  rest: string;
  estimatedMinutes: number | null;
} {
  // Read before the clock time on purpose: "~1h30" is a duration, and the same
  // digits without the tilde would otherwise be taken for an hour of the day.
  const match =
    /(?:^|\s)~\s*(?:(\d{1,2})\s*h(?:oras?)?\s*(\d{1,2})?|(\d{1,3})\s*(?:h(?:oras?)?|m(?:in(?:utos?)?)?)?)/i.exec(
      input,
    );

  if (match == null) return { rest: input, estimatedMinutes: null };

  const rest = removeRange(input, match.index, match[0].length);

  if (match[1] != null) {
    const minutes =
      Number(match[1]) * 60 + (match[2] == null ? 0 : Number(match[2]));

    return { rest, estimatedMinutes: minutes };
  }

  const amount = Number(match[3]);
  const isHours = /h/i.test(match[0].slice(match[0].indexOf(match[3])));

  return { rest, estimatedMinutes: isHours ? amount * 60 : amount };
}

function extractDay(input: string, nowMs: number): Extraction {
  let rest = input;
  let dayMs: number | null = null;

  const dayAfterTomorrow = /(?:^|\s)depois de amanh[ãa]/i.exec(rest);
  if (dayAfterTomorrow != null) {
    dayMs = startOfDay(nowMs) + 2 * DAY_MS;
    rest = removeRange(
      rest,
      dayAfterTomorrow.index,
      dayAfterTomorrow[0].length,
    );
  }

  if (dayMs == null) {
    const tomorrow = /(?:^|\s)amanh[ãa]/i.exec(rest);
    if (tomorrow != null) {
      dayMs = startOfDay(nowMs) + DAY_MS;
      rest = removeRange(rest, tomorrow.index, tomorrow[0].length);
    }
  }

  if (dayMs == null) {
    const today = /(?:^|\s)hoje/i.exec(rest);
    if (today != null) {
      dayMs = startOfDay(nowMs);
      rest = removeRange(rest, today.index, today[0].length);
    }
  }

  if (dayMs == null) {
    const explicit = /(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(rest);
    if (explicit != null) {
      const day = Number(explicit[1]);
      const month = Number(explicit[2]) - 1;
      const typedYear = explicit[3] == null ? null : Number(explicit[3]);
      const year =
        typedYear == null
          ? new Date(nowMs).getFullYear()
          : typedYear < 100
          ? 2000 + typedYear
          : typedYear;
      const candidate = new Date(year, month, day);

      if (
        candidate.getDate() === day &&
        candidate.getMonth() === month &&
        candidate.getFullYear() === year
      ) {
        // A day already gone with no year typed means the one coming, not the
        // one that passed.
        const rolled =
          typedYear == null && candidate.getTime() < startOfDay(nowMs)
            ? new Date(year + 1, month, day)
            : candidate;

        dayMs = startOfDay(rolled.getTime());
        rest = removeRange(rest, explicit.index, explicit[0].length);
      }
    }
  }

  if (dayMs == null) {
    const weekday = /(?:^|\s)([\p{L}]+(?:-feira)?)/gu;
    let match = weekday.exec(rest);

    while (match != null) {
      const word = stripAccents(match[1].toLowerCase());
      const target = WEEKDAY_WORDS[word];

      if (target != null) {
        dayMs = nextWeekday(nowMs, target);
        rest = removeRange(rest, match.index, match[0].length);
        break;
      }

      match = weekday.exec(rest);
    }
  }

  const time = /(?:^|\s)(\d{1,2})(?:[h:](\d{2})?)(?:\s*(?:h|hs))?/i.exec(rest);
  let hours: number | null = null;
  let minutes = 0;

  if (time != null) {
    const typedHours = Number(time[1]);

    if (typedHours >= 0 && typedHours <= 23) {
      hours = typedHours;
      minutes = time[2] == null ? 0 : Number(time[2]);

      if (minutes >= 0 && minutes <= 59) {
        rest = removeRange(rest, time.index, time[0].length);
      } else {
        hours = null;
        minutes = 0;
      }
    }
  }

  return { rest, dayMs, hours, minutes };
}

/**
 * Reads one typed line into a task.
 *
 * Everything the parser understands is removed from the title, so what is left
 * is the sentence the person meant to write. Nothing is guessed: an
 * unrecognised `!word` stays in the title rather than silently becoming a
 * priority nobody asked for.
 */
export function parseCapture(input: string, nowMs: number): CapturedDraft {
  const priorityPass = extractPriority(input);
  const listPass = extractList(priorityPass.rest);
  const estimatePass = extractEstimate(listPass.rest);
  const dayPass = extractDay(estimatePass.rest, nowMs);

  let dueAtMs: number | null = null;

  if (dayPass.hours != null) {
    const day = dayPass.dayMs ?? startOfDay(nowMs);
    const atTime = atTimeOnDay(day, dayPass.hours, dayPass.minutes);

    // A time alone that has already passed today belongs to tomorrow: nobody
    // types "8h" at nine in the morning meaning an hour ago.
    dueAtMs =
      dayPass.dayMs == null && atTime < nowMs ? atTime + DAY_MS : atTime;
  } else if (dayPass.dayMs != null) {
    dueAtMs = endOfDay(dayPass.dayMs);
  }

  const title = cleanTitle(dayPass.rest);

  return {
    title: title.length > 0 ? title : cleanTitle(input),
    priority: priorityPass.priority ?? 'medium',
    dueAtMs,
    estimatedMinutes: estimatePass.estimatedMinutes,
    listName: listPass.listName,
    hasTimeOfDay: dayPass.hours != null,
  };
}

/** True when the line carries anything worth saving. */
export function isCaptureUsable(input: string): boolean {
  return cleanTitle(input).length > 0;
}
