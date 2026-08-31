import type { AppLanguage } from '../localization/taskCopy';

export const CALENDAR_NAMES: Record<
  AppLanguage,
  { weekdays: readonly string[]; months: readonly string[]; joiner: string }
> = {
  'pt-BR': {
    weekdays: [
      'Domingo',
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado',
    ],
    months: [
      'janeiro',
      'fevereiro',
      'março',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ],
    joiner: ' de ',
  },
  'en-US': {
    weekdays: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    joiner: ' ',
  },
};

/**
 * The line above the title: "Terça, 28 de agosto".
 *
 * Written by hand rather than through `Intl`, which is not present on every
 * engine this app ships to and would fall back to an English date on the ones
 * where it is missing.
 */
export function formatDayLabel(atMs: number, language: AppLanguage): string {
  const names = CALENDAR_NAMES[language] ?? CALENDAR_NAMES['pt-BR'];
  const date = new Date(atMs);
  const weekday = names.weekdays[date.getDay()];
  const month = names.months[date.getMonth()];

  return language === 'en-US'
    ? `${weekday}, ${month} ${date.getDate()}`
    : `${weekday}, ${date.getDate()}${names.joiner}${month}`;
}
