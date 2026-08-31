import { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import type { Clock } from '../../application/ports/Clock';
import {
  finishFocus,
  focusFraction,
  focusMinutesFor,
  formatRemaining,
  hasElapsed,
  pauseFocus,
  resumeFocus,
  startFocus,
  type FocusSession,
} from '../../domain/FocusSession';
import type { Task } from '../../domain/Task';
import type { TaskEventBus } from '../../domain/TaskEvent';

interface FocusDependencies {
  bus: TaskEventBus;
  clock: Clock;
}

/** The label is a clock, so it is redrawn once a second and no faster. */
const TICK_MS = 250;

/**
 * The timer.
 *
 * The ring's progress is a shared value written on every tick, so the drawing
 * never crosses the React tree; only the mm:ss label does, once a second. On a
 * cheap phone that difference is the whole reason the ring stays smooth.
 */
export function useFocusViewModel({ bus, clock }: FocusDependencies) {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [label, setLabel] = useState('00:00');
  const fraction = useSharedValue(0);
  const sessionRef = useRef<FocusSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (session == null || session.phase !== 'running') return;

    const timer = setInterval(() => {
      const running = sessionRef.current;
      if (running == null) return;

      const now = clock.now();

      fraction.value = focusFraction(running, now);
      setLabel(formatRemaining(running, now));

      if (hasElapsed(running, now)) {
        const finished = finishFocus(running, now);

        sessionRef.current = finished;
        setSession(finished);
        bus.publish({
          type: 'focus.finished',
          at: now,
          taskId: finished.taskId,
          elapsedMs: finished.elapsedBeforeMs,
          reachedEnd: true,
        });
      }
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [bus, clock, fraction, session]);

  const start = useCallback(
    (task: Task) => {
      const now = clock.now();
      const next = startFocus(
        task.id,
        focusMinutesFor(task.estimatedMinutes),
        now,
      );

      sessionRef.current = next;
      setSession(next);
      fraction.value = 0;
      setLabel(formatRemaining(next, now));
      bus.publish({
        type: 'focus.started',
        at: now,
        taskId: task.id,
        plannedMs: next.plannedMs,
      });
    },
    [bus, clock, fraction],
  );

  const pause = useCallback(() => {
    setSession(existing =>
      existing == null ? existing : pauseFocus(existing, clock.now()),
    );
  }, [clock]);

  const resume = useCallback(() => {
    setSession(existing =>
      existing == null ? existing : resumeFocus(existing, clock.now()),
    );
  }, [clock]);

  const stop = useCallback(() => {
    const running = sessionRef.current;

    if (running != null) {
      const now = clock.now();
      const finished = finishFocus(running, now);

      bus.publish({
        type: 'focus.finished',
        at: now,
        taskId: finished.taskId,
        elapsedMs: finished.elapsedBeforeMs,
        reachedEnd: false,
      });
    }

    sessionRef.current = null;
    setSession(null);
    fraction.value = 0;
  }, [bus, clock, fraction]);

  return {
    session,
    fraction,
    label,
    isRunning: session?.phase === 'running',
    isPaused: session?.phase === 'paused',
    isFinished: session?.phase === 'finished',
    start,
    pause,
    resume,
    stop,
  };
}

export type FocusViewModel = ReturnType<typeof useFocusViewModel>;
