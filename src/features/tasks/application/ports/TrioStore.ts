import type { TrioSelection } from '../../domain/Trio';

export interface TrioStore {
  load(): Promise<unknown>;
  save(trio: TrioSelection): Promise<void>;
}
