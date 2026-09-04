/**
 * Days in a row where everybody in a shared project closed what they took,
 * per project.
 *
 * It stays on the device on purpose: the count is derived from what this
 * phone was able to see, and nobody else's progress is stored anywhere.
 */
export interface GroupStreakStore {
  load(): Promise<unknown>;
  save(streaks: Record<string, unknown>): Promise<void>;
}
