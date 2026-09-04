/**
 * What this device has already announced, per shared project.
 *
 * It is the single source of dedupe: the foreground pull and the background
 * sweep write to the same ledger, so a fact told by one is never told again
 * by the other.
 */
export interface ProjectActivityLedger {
  /** Keys of events already announced, oldest first. */
  keys: readonly string[];
  /** False until this device has seen the project once. The first pass records
   * whatever is already there without saying a word — joining a project with
   * months of history must not fill the tray. */
  bootstrapped: boolean;
}

export interface ActivityLedgerStore {
  load(token: string): Promise<ProjectActivityLedger>;
  save(token: string, ledger: ProjectActivityLedger): Promise<void>;
  /** Forgets every project. Used when the notifications toggle is switched
   * back on, so the next sweep bootstraps in silence instead of announcing
   * everything that happened while it was off. */
  reset(): Promise<void>;
}
