import type { ProgressState } from '../../domain/Progress';

export interface ProgressStore {
  load(): Promise<unknown>;
  save(progress: ProgressState): Promise<void>;
}
