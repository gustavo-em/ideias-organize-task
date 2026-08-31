/** What a focus block lasts when the task carries no estimate of its own. */
export const DEFAULT_FOCUS_MINUTES = 25;

/** Longest block offered. Past this the timer stops being focus and starts
 * being a stopwatch nobody looks at. */
export const MAX_FOCUS_MINUTES = 180;

/** Shortest block a user can choose by hand. Below this it is not a session,
 * it is a reminder. */
export const MIN_FOCUS_MINUTES = 5;

/** Keeps a hand-picked duration inside the range the timer was built for. */
export function clampFocusMinutes(minutes: number): number {
  return Math.min(MAX_FOCUS_MINUTES, Math.max(MIN_FOCUS_MINUTES, Math.round(minutes)));
}

export type FocusPhase = 'running' | 'paused' | 'finished';

export interface FocusSession {
  taskId: string;
  plannedMs: number;
  /** Time already counted before the current run. */
  elapsedBeforeMs: number;
  /** When the current run started, or null while paused or finished. */
  runningSinceMs: number | null;
  phase: FocusPhase;
}

export function focusMinutesFor(estimatedMinutes: number | null): number {
  if (estimatedMinutes == null || estimatedMinutes <= 0) {
    return DEFAULT_FOCUS_MINUTES;
  }

  return Math.min(estimatedMinutes, 90);
}

export function startFocus(
  taskId: string,
  minutes: number,
  atMs: number,
): FocusSession {
  return {
    taskId,
    plannedMs: Math.max(1, Math.round(minutes)) * 60 * 1000,
    elapsedBeforeMs: 0,
    runningSinceMs: atMs,
    phase: 'running',
  };
}

export function elapsedMs(session: FocusSession, atMs: number): number {
  if (session.runningSinceMs == null) return session.elapsedBeforeMs;

  return session.elapsedBeforeMs + Math.max(0, atMs - session.runningSinceMs);
}

export function remainingMs(session: FocusSession, atMs: number): number {
  return Math.max(0, session.plannedMs - elapsedMs(session, atMs));
}

/** Zero to one, for the ring. Clamped so an app left open overnight does not
 * draw a circle three times around. */
export function focusFraction(session: FocusSession, atMs: number): number {
  if (session.plannedMs <= 0) return 1;

  return Math.min(1, elapsedMs(session, atMs) / session.plannedMs);
}

export function pauseFocus(session: FocusSession, atMs: number): FocusSession {
  if (session.phase !== 'running') return session;

  return {
    ...session,
    elapsedBeforeMs: elapsedMs(session, atMs),
    runningSinceMs: null,
    phase: 'paused',
  };
}

export function resumeFocus(session: FocusSession, atMs: number): FocusSession {
  if (session.phase !== 'paused') return session;

  return { ...session, runningSinceMs: atMs, phase: 'running' };
}

export function finishFocus(session: FocusSession, atMs: number): FocusSession {
  if (session.phase === 'finished') return session;

  return {
    ...session,
    elapsedBeforeMs: elapsedMs(session, atMs),
    runningSinceMs: null,
    phase: 'finished',
  };
}

/** True once the planned time is spent, which is what turns the ring over to
 * the finished state without anybody tapping anything. */
export function hasElapsed(session: FocusSession, atMs: number): boolean {
  return session.phase === 'running' && remainingMs(session, atMs) === 0;
}

/** mm:ss, the only place in the app that formats a duration. */
export function formatRemaining(session: FocusSession, atMs: number): string {
  const totalSeconds = Math.ceil(remainingMs(session, atMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}
