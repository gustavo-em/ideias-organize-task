import type { AppLanguage } from './taskCopy';

/** What a reminder says when it goes off. The title is the person's own words,
 * and the line under it only says what kind of thing just spoke — never that
 * anything is late, and never that anybody failed to do something. */
export function reminderNotificationLines(
  title: string,
  language: AppLanguage,
): { title: string; body: string } {
  return language === 'pt-BR'
    ? { title, body: 'Lembrete de hoje' }
    : { title, body: "Today's reminder" };
}
