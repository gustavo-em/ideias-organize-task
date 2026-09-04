/**
 * Where a crash goes.
 *
 * The app cannot ask somebody what they were doing when it died, so it has to
 * have written that down beforehand: `log` leaves the breadcrumbs, `identify`
 * says how many people a crash reached rather than how many times it happened,
 * and `recordError` is for the failures that were caught and survived — the
 * ones no crash report would ever show.
 *
 * Nothing here carries what somebody wrote.
 */
export interface CrashReporter {
  identify(personId: string | null): void;
  /** A breadcrumb: short, and never a title or typed text. */
  log(message: string): void;
  /** A failure that did not take the app down. `where` names the seam it came
   * from, so a report can be read without a stack trace alone. */
  recordError(error: unknown, where: string): void;
}
