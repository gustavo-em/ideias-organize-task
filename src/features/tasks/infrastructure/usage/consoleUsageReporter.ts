import type { UsageReporter } from '../../application/ports/UsageReporter';

/**
 * Telemetry, read while building.
 *
 * The port is what the app depends on; this adapter only writes to the log in
 * development, so the events can be checked before they are believed. It is
 * kept alongside the Firebase adapter rather than replaced by it: a console
 * line is the only way to see what an event carries without a console on the
 * other side of the internet.
 */
export const consoleUsageReporter: UsageReporter = {
  async identify(personId) {
    report('identify', { personId });
  },
  async taskCaptured(input) {
    report('task_captured', input);
  },
  async taskCompleted(input) {
    report('task_completed', input);
  },
  async groupCreated(input) {
    report('group_created', input);
  },
  async trioCompleted(input) {
    report('trio_completed', input);
  },
  async focusStarted(input) {
    report('focus_started', input);
  },
  async focusFinished(input) {
    report('focus_finished', input);
  },
  async screenOpened(screen) {
    report('screen_opened', { screen });
  },
  async listShared() {
    report('list_shared', {});
  },
  async listMemberJoined(input) {
    report('list_member_joined', input);
  },
  async onboardingFinished(input) {
    report('onboarding_finished', input);
  },
};

function report(name: string, payload: Record<string, unknown>): void {
  if (!__DEV__) return;

  console.log(`[usage] ${name}`, payload);
}
