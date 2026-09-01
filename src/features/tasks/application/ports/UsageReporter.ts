/**
 * What the product learns about its own use.
 *
 * It never carries what somebody wrote: a task title is theirs. What is
 * reported is the shape of the action — that a task was captured, how it was
 * captured, whether the day closed.
 */
export interface UsageReporter {
  taskCaptured(input: {
    priority: string;
    hasDueDate: boolean;
    hasList: boolean;
    /** Seconds spent in the capture sheet, or null when untimed. */
    tookSeconds: number | null;
  }): Promise<void>;
  taskCompleted(input: { weight: number; inTrio: boolean }): Promise<void>;
  trioCompleted(input: { streakDays: number }): Promise<void>;
  focusFinished(input: { minutes: number; reachedEnd: boolean }): Promise<void>;
  screenOpened(screen: string): Promise<void>;
  listShared(): Promise<void>;
}
