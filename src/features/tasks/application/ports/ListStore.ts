import type { TaskList } from '../../domain/TaskList';

export interface ListStore {
  load(): Promise<unknown>;
  save(lists: readonly TaskList[]): Promise<void>;
}
