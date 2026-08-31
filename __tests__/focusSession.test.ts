import {
  DEFAULT_FOCUS_MINUTES,
  elapsedMs,
  finishFocus,
  focusFraction,
  focusMinutesFor,
  formatRemaining,
  hasElapsed,
  pauseFocus,
  remainingMs,
  resumeFocus,
  startFocus,
} from '../src/features/tasks/domain/FocusSession';

const start = new Date(2026, 7, 25, 9, 0).getTime();
const MINUTE = 60000;

describe('focus session', () => {
  it('uses the task estimate, or the default when there is none', () => {
    expect(focusMinutesFor(null)).toBe(DEFAULT_FOCUS_MINUTES);
    expect(focusMinutesFor(0)).toBe(DEFAULT_FOCUS_MINUTES);
    expect(focusMinutesFor(45)).toBe(45);
    // Past an hour and a half a timer stops being focus.
    expect(focusMinutesFor(600)).toBe(90);
  });

  it('counts only the time it was actually running', () => {
    const session = startFocus('a', 25, start);
    const paused = pauseFocus(session, start + 5 * MINUTE);
    const resumed = resumeFocus(paused, start + 30 * MINUTE);

    expect(elapsedMs(paused, start + 20 * MINUTE)).toBe(5 * MINUTE);
    expect(elapsedMs(resumed, start + 32 * MINUTE)).toBe(7 * MINUTE);
    expect(remainingMs(resumed, start + 32 * MINUTE)).toBe(18 * MINUTE);
  });

  it('stops at zero rather than counting backwards', () => {
    const session = startFocus('a', 5, start);

    expect(remainingMs(session, start + 60 * MINUTE)).toBe(0);
    expect(focusFraction(session, start + 60 * MINUTE)).toBe(1);
    expect(hasElapsed(session, start + 6 * MINUTE)).toBe(true);
  });

  it('reports a session as over only while it is running', () => {
    const finished = finishFocus(startFocus('a', 5, start), start + MINUTE);

    expect(hasElapsed(finished, start + 60 * MINUTE)).toBe(false);
    expect(finishFocus(finished, start + 90 * MINUTE)).toBe(finished);
    expect(finished.elapsedBeforeMs).toBe(MINUTE);
  });

  it('ignores a pause on something that is not running', () => {
    const paused = pauseFocus(startFocus('a', 25, start), start);

    expect(pauseFocus(paused, start + MINUTE)).toBe(paused);
    expect(resumeFocus(startFocus('a', 25, start), start)).not.toBeNull();
  });

  it('writes the clock the way a clock is read', () => {
    const session = startFocus('a', 25, start);

    expect(formatRemaining(session, start)).toBe('25:00');
    expect(formatRemaining(session, start + 6.5 * MINUTE)).toBe('18:30');
    expect(formatRemaining(session, start + 60 * MINUTE)).toBe('00:00');
  });
});
