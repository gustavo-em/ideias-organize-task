import type { Unsubscribe } from '../../../../shared/events/EventBus';
import type { ListStore } from '../../application/ports/ListStore';
import type { ProgressStore } from '../../application/ports/ProgressStore';
import type { TaskStore } from '../../application/ports/TaskStore';
import type { TrioStore } from '../../application/ports/TrioStore';
import type { TaskEventBus } from '../../domain/TaskEvent';
import type { Workspace } from '../../domain/Workspace';

interface PersistenceDependencies {
  taskStore: TaskStore;
  listStore: ListStore;
  progressStore: ProgressStore;
  trioStore: TrioStore;
  /** How long writes are held back. Ticking three boxes in a row should cost
   * one write, not three. */
  debounceMs?: number;
  /** What is already on disk. Given it, the first commit after a restore does
   * not write back exactly what was just read. */
  restored?: Workspace;
  onError?: (error: unknown) => void;
}

const DEFAULT_DEBOUNCE_MS = 400;

/**
 * Saving, as a reaction rather than an obligation.
 *
 * Every use case ends by publishing `workspace.committed`, so nothing in the
 * application layer has to remember to write to disk — and a change made from
 * a screen that does not exist yet is saved by the same rule.
 *
 * Only the parts that actually changed are written: a run of completions
 * touches tasks and progress, and leaves the list of lists alone.
 */
export function createPersistenceSubscriber(
  bus: TaskEventBus,
  dependencies: PersistenceDependencies,
): Unsubscribe {
  const {
    taskStore,
    listStore,
    progressStore,
    trioStore,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    restored,
    onError,
  } = dependencies;

  let pending: Workspace | null = null;
  let saved: Workspace | null = restored ?? null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function fail(error: unknown): void {
    onError?.(error);
  }

  function flush(): void {
    timer = null;

    const workspace = pending;
    if (workspace == null) return;

    pending = null;

    if (saved == null || saved.tasks !== workspace.tasks) {
      taskStore.save(workspace.tasks).catch(fail);
    }
    if (saved == null || saved.lists !== workspace.lists) {
      listStore.save(workspace.lists).catch(fail);
    }
    if (saved == null || saved.progress !== workspace.progress) {
      progressStore.save(workspace.progress).catch(fail);
    }
    if (saved == null || saved.trio !== workspace.trio) {
      trioStore.save(workspace.trio).catch(fail);
    }

    saved = workspace;
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
      // Whatever was waiting is written now: leaving the screen is not a
      // reason to lose the last tick.
      flush();
    }
  };
}
