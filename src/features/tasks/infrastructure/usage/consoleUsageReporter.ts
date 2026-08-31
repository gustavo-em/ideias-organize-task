import type { UsageReporter } from '../../application/ports/UsageReporter';

/**
 * Where telemetry goes before there is any telemetry.
 *
 * The port is what the app depends on; this adapter only writes to the log in
 * development so the events can be read while building. Swapping it for a real
 * analytics client later is a change to one line in the composition root.
 */
export const consoleUsageReporter: UsageReporter = {
  async taskCaptured(input) {
    report('task_captured', input);
  },
  async taskCompleted(input) {
    report('task_completed', input);
  },
  async trioCompleted(input) {
    report('trio_completed', input);
  },
  async focusFinished(input) {
    report('focus_finished', input);
  },
  async screenOpened(screen) {
    report('screen_opened', { screen });
  },
};

function report(name: string, payload: Record<string, unknown>): void {
  if (!__DEV__) return;

  console.log(`[usage] ${name}`, payload);
}
