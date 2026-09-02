import type {
  ActivityActor,
  ProjectActivityEvent,
} from '../../domain/ProjectActivity';
import type { AppLanguage } from './taskCopy';

/**
 * What a notification about a shared project says, in both languages.
 *
 * Plain data and plain functions: the background sweep builds its lines with
 * this file and never touches a screen, a theme or a hook. Nothing here blames
 * anybody — it reports a fact and stops.
 */
interface ActivityNotificationCopy {
  /** Channel shown in the Android system settings. */
  channelName: string;
  channelDescription: string;
  someone: string;
  completed: (person: string, taskTitle: string) => string;
  joined: (person: string, projectName: string) => string;
  summary: (count: number, projectName: string) => string;
}

const COPY: Record<AppLanguage, ActivityNotificationCopy> = {
  'pt-BR': {
    channelName: 'Atividade do projeto',
    channelDescription:
      'Avisos de quem concluiu uma tarefa ou entrou num projeto compartilhado.',
    someone: 'Alguém do projeto',
    completed: (person, taskTitle) => `${person} concluiu “${taskTitle}”`,
    joined: (person, projectName) => `${person} entrou em ${projectName}`,
    summary: (count, projectName) => `${count} atualizações em ${projectName}`,
  },
  'en-US': {
    channelName: 'Project activity',
    channelDescription:
      'Alerts when someone completes a task or joins a shared project.',
    someone: 'Someone in the project',
    completed: (person, taskTitle) => `${person} completed “${taskTitle}”`,
    joined: (person, projectName) => `${person} joined ${projectName}`,
    summary: (count, projectName) => `${count} updates in ${projectName}`,
  },
};

export function getActivityNotificationCopy(
  language: AppLanguage,
): ActivityNotificationCopy {
  return COPY[language] ?? COPY['pt-BR'];
}

/** Who the line is about: the name they chose, the handle when there is no
 * usable name, and a neutral word when the project knows neither. An address
 * never gets here — the domain already dropped it. */
function personLabel(
  actor: ActivityActor,
  copy: ActivityNotificationCopy,
  prefixHandle: boolean,
): string {
  if (actor.name != null) return actor.name;
  if (actor.handle != null) {
    return prefixHandle ? `@${actor.handle}` : actor.handle;
  }

  return copy.someone;
}

/** Title is the project, body is the fact. */
export function activityNotificationLines(
  event: ProjectActivityEvent,
  language: AppLanguage,
): { title: string; body: string } {
  const copy = getActivityNotificationCopy(language);

  return event.kind === 'task-completed'
    ? {
        title: event.projectName,
        body: copy.completed(
          personLabel(event.actor, copy, false),
          event.taskTitle,
        ),
      }
    : {
        title: event.projectName,
        body: copy.joined(
          personLabel(event.actor, copy, true),
          event.projectName,
        ),
      };
}

export function activitySummaryLine(
  events: readonly ProjectActivityEvent[],
  language: AppLanguage,
): { title: string; body: string } {
  const copy = getActivityNotificationCopy(language);
  const projectName = events[0]?.projectName ?? '';

  return {
    title: projectName,
    body: copy.summary(events.length, projectName),
  };
}
