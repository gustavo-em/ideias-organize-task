import {
  getCrashlytics,
  log,
  recordError,
  setUserId,
} from '@react-native-firebase/crashlytics';

import type { CrashReporter } from '../../application/ports/CrashReporter';

/**
 * Crash reporting, sent to Firebase Crashlytics.
 *
 * Native crashes and unhandled JavaScript errors are collected by the library
 * itself; what this adapter adds is the context around them — who it happened
 * to, and what the last few steps were — plus the errors the app catches and
 * carries on from, which no crash report would ever contain.
 *
 * Every call is fire-and-forget: telemetry that can fail must never be able to
 * fail the thing it is watching.
 */
export const firebaseCrashReporter: CrashReporter = {
  identify(personId) {
    setUserId(crashlytics(), personId ?? '').catch(ignore);
  },

  log(message) {
    try {
      log(crashlytics(), message);
    } catch {
      // A breadcrumb is not worth a crash of its own.
    }
  },

  recordError(error, where) {
    const reported =
      error instanceof Error ? error : new Error(describe(error));

    // The name is what groups the reports in the console, so the seam it came
    // from is part of it rather than buried in the message.
    reported.name = `${where}: ${reported.name}`;

    try {
      recordError(crashlytics(), reported, where);
    } catch {
      // Same reason as above.
    }
  },
};

/** Resolved on every call rather than held: the default app is configured by
 * the native side at launch, and this module is imported before that. */
function crashlytics() {
  return getCrashlytics();
}

function describe(error: unknown): string {
  if (typeof error === 'string') return error;

  try {
    return JSON.stringify(error) ?? 'unknown error';
  } catch {
    return 'unknown error';
  }
}

function ignore(): void {}
