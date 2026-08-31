import type { Task } from '../../domain/Task';

/**
 * Where tasks live between two runs of the app.
 *
 * `load` returns `unknown` on purpose: what came back from a device's disk is
 * not a `Task[]` until the domain has looked at it.
 */
export interface TaskStore {
  load(): Promise<unknown>;
  save(tasks: readonly Task[]): Promise<void>;
}
