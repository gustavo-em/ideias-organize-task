import type { Unsubscribe } from '../../../../shared/events/EventBus';
import type { ShareGateway } from '../../application/ports/ShareGateway';
import { canEdit } from '../../domain/TaskList';
import type { TaskEventBus } from '../../domain/TaskEvent';
import type { Workspace } from '../../domain/Workspace';

interface SharePushDependencies {
  shareGateway: ShareGateway;
  personId: string;
  /** How long writes are held back, same reasoning as the persistence
   * subscriber: three ticks in a row should upload once. */
  debounceMs?: number;
  onError?: (error: unknown) => void;
}

const DEFAULT_DEBOUNCE_MS = 600;

/**
 * Uploads a shared project's list and tasks after a local change, so the
 * next pull on another member's phone sees them.
 *
 * Only whoever can edit pushes — a viewer's device never writes upstream,
 * matching the role the project already agreed to.
 */
export function createSharePushSubscriber(
  bus: TaskEventBus,
  dependencies: SharePushDependencies,
): Unsubscribe {
  const {
    shareGateway,
    personId,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    onError,
  } = dependencies;

  let pending: Workspace | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush(): void {
    timer = null;

    const workspace = pending;
    if (workspace == null) return;

    pending = null;

    for (const list of workspace.lists) {
      if (list.share == null || !canEdit(list, personId)) continue;

      const tasks = workspace.tasks.filter(task => task.listId === list.id);
      shareGateway
        .push(list.share, list, tasks)
        .catch(error => onError?.(error));
    }
  }

  const unsubscribe = bus.on('workspace.committed', event => {
    pending = event.workspace;

    if (timer != null) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  });

  return () => {
    unsubscribe();

    if (timer != null) {
      clearTimeout(timer);
      flush();
    }
  };
}
