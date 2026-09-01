import { useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * Development-only stopwatch for how a bottom sheet opens.
 *
 * Everything here is behind `__DEV__`: in a release build every function
 * returns immediately and nothing is stored or logged. It exists to answer two
 * questions with numbers instead of impressions — how many times a component
 * rendered while a sheet was opening, and how long the sheet took to land
 * after the press that asked for it.
 */

const pressedAt = new Map<string, number>();
const renderCounts = new Map<string, number>();

/** Marks the moment a press asked for a sheet. Call it inside the `onPress`. */
export function markSheetPress(name: string): void {
  if (!__DEV__) return;
  pressedAt.set(name, Date.now());
}

/** Counts one render of a component. Used by the perf harness and the logs. */
export function countRender(name: string): void {
  if (!__DEV__) return;
  renderCounts.set(name, (renderCounts.get(name) ?? 0) + 1);
}

/** Renders counted so far, by component name. */
export function readRenderCounts(): Record<string, number> {
  if (!__DEV__) return {};
  return Object.fromEntries(renderCounts);
}

/** Clears the counters, so a measurement starts from a known point. */
export function resetRenderCounts(): void {
  if (!__DEV__) return;
  renderCounts.clear();
  pressedAt.clear();
}

/** Counts every render of the component that calls it. */
export function useRenderCount(name: string): void {
  if (!__DEV__) return;
  countRender(name);
}

/**
 * Traces one sheet from press to first layout.
 *
 * Returns the `onLayout` to hand to the sheet's own root: the first layout is
 * the frame where the sheet exists on screen, which is what "the sheet is up"
 * means to the person holding the phone.
 */
export function useSheetOpenTrace(
  name: string,
): (event: LayoutChangeEvent) => void {
  const reported = useRef(false);

  if (__DEV__) countRender(name);

  return function handleLayout() {
    if (!__DEV__ || reported.current) return;
    reported.current = true;

    const start = pressedAt.get(name);
    const renders = renderCounts.get(name) ?? 0;
    const elapsed = start == null ? null : Date.now() - start;

    console.log(
      `[sheet-perf] ${name} renders=${renders} settle=${
        elapsed == null ? 'n/a' : `${elapsed}ms`
      }`,
    );
  };
}
