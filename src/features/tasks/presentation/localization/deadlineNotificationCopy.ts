import type { AppLanguage } from './taskCopy';

/**
 * What a deadline reminder says, in both languages.
 *
 * It reports a date and stops: no "you did not finish", no count of how late
 * anything is. The task's own title is the title of the notification, so the
 * tray shows the person's words before the app's.
 */
interface DeadlineNotificationCopy {
  dueToday: string;
  dueTomorrow: string;
  dueInDays: (days: number) => string;
}

const COPY: Record<AppLanguage, DeadlineNotificationCopy> = {
  'pt-BR': {
    dueToday: 'Vence hoje',
    dueTomorrow: 'Vence amanhã',
    dueInDays: days => `Vence em ${days} dias`,
  },
  'en-US': {
    dueToday: 'Due today',
    dueTomorrow: 'Due tomorrow',
    dueInDays: days => `Due in ${days} days`,
  },
};

export function getDeadlineNotificationCopy(
  language: AppLanguage,
): DeadlineNotificationCopy {
  return COPY[language] ?? COPY['pt-BR'];
}

/** Title is the task, body is how much time is left. */
export function deadlineNotificationLines(
  taskTitle: string,
  daysBefore: number,
  language: AppLanguage,
): { title: string; body: string } {
  const copy = getDeadlineNotificationCopy(language);

  return {
    title: taskTitle,
    body:
      daysBefore <= 0
        ? copy.dueToday
        : daysBefore === 1
        ? copy.dueTomorrow
        : copy.dueInDays(daysBefore),
  };
}
