import {
  EMPTY_PROGRESS,
  sanitizeProgress,
  type ProgressState,
} from './Progress';
import { sanitizeTasks, type Task } from './Task';
import { DEFAULT_LISTS, sanitizeLists, type TaskList } from './TaskList';
import { EMPTY_TRIO, sanitizeTrio, type TrioSelection } from './Trio';

/**
 * Everything the tasks feature knows, in one value.
 *
 * Use cases take a workspace and return the next one. Keeping the whole state
 * in a single immutable value is what lets every rule be tested as a plain
 * function, with no store, no timer, and no React in the way.
 */
export interface Workspace {
  tasks: readonly Task[];
  lists: readonly TaskList[];
  progress: ProgressState;
  trio: TrioSelection;
}

export const EMPTY_WORKSPACE: Workspace = {
  tasks: [],
  lists: DEFAULT_LISTS,
  progress: EMPTY_PROGRESS,
  trio: EMPTY_TRIO,
};

export interface StoredWorkspace {
  tasks: unknown;
  lists: unknown;
  progress: unknown;
  trio: unknown;
}

/** Everything read back from disk passes through here before a screen sees it. */
export function sanitizeWorkspace(
  stored: StoredWorkspace,
  nowMs: number,
): Workspace {
  return {
    tasks: sanitizeTasks(stored.tasks),
    lists: sanitizeLists(stored.lists),
    progress: sanitizeProgress(stored.progress),
    trio: sanitizeTrio(stored.trio, nowMs),
  };
}
