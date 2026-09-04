import type { CaptureOrigin } from '../../domain/TaskEvent';

/**
 * What the product learns about its own use.
 *
 * It never carries what somebody wrote: a task title is theirs. What is
 * reported is the shape of the action — that a task was captured, how it was
 * captured, whether the day closed.
 */
export interface UsageReporter {
  /** Ties what follows to one account, so a person opening the app on a second
   * phone counts once. Null on sign-out: nothing after it belongs to anybody.
   * The identifier is the account's own, never an address or a name. */
  identify(personId: string | null): Promise<void>;
  taskCaptured(input: {
    priority: string;
    hasDueDate: boolean;
    hasList: boolean;
    /** Task or reminder. The two are captured in the same sheet and land in
     * the same store, so only this says which of the two people reach for. */
    kind: string;
    /** How often a reminder comes back, or null on a task. */
    recurrence: string | null;
    /** The task was written into a group inside a space. */
    hasGroup: boolean;
    /** A deadline warning was asked for, in days before the date. */
    remindDaysBefore: number | null;
    /** How many steps were written in the same breath as the title. */
    subtaskCount: number;
    /** Which screen opened the sheet, or null when nothing said. */
    origin: CaptureOrigin | null;
    /** Seconds spent in the capture sheet, or null when untimed. */
    tookSeconds: number | null;
  }): Promise<void>;
  taskCompleted(input: { weight: number; inTrio: boolean }): Promise<void>;
  /** A reason opened inside a space. Groups are the heaviest thing the spaces
   * screen asks for, so whether they are made at all is a product question,
   * and a dated group is a different intent from an open project. */
  groupCreated(input: { icon: string; hasEventDate: boolean }): Promise<void>;
  trioCompleted(input: { streakDays: number }): Promise<void>;
  /** Somebody started a timer. Paired with `focusFinished` this says how much
   * of the feature is opened versus how much of it is used to the end. */
  focusStarted(input: { plannedMinutes: number }): Promise<void>;
  focusFinished(input: { minutes: number; reachedEnd: boolean }): Promise<void>;
  screenOpened(screen: string): Promise<void>;
  listShared(): Promise<void>;
  /** An invite was accepted: the other side of `listShared`, and the only
   * event that says sharing reached a second person. */
  listMemberJoined(input: { memberCount: number }): Promise<void>;
  /** How the walk-through was answered. The invite step is a question asked
   * once, and this is the only place the answer is counted. */
  onboardingFinished(input: { outcome: string }): Promise<void>;
}
