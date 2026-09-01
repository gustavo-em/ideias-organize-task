import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { lightTheme } from '../src/app/theme/theme';
import type { Task } from '../src/features/tasks/domain/Task';
import type { ListMember } from '../src/features/tasks/domain/TaskList';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';
import type {
  SharedDayEntry,
  SharedDayStatus,
} from '../src/features/tasks/presentation/models/sharedDay';
import { CheckGlyph } from '../src/features/tasks/presentation/views/FieldGlyphs';
import { SharedDayBand } from '../src/features/tasks/presentation/views/SharedDayBand';
import { FocusGlyph } from '../src/features/tasks/presentation/views/TabGlyphs';

const copy = getTaskCopy('pt-BR');
const NOW = new Date(2026, 8, 1, 10, 0, 0).getTime();

function member(personId: string, name: string): ListMember {
  return { personId, name, handle: null, role: 'editor', joined: true };
}

function task(id: string, title: string, completedAtMs: number | null): Task {
  return {
    id,
    title,
    listId: 'lancamento',
    priority: 'medium',
    dueAtMs: null,
    estimatedMinutes: null,
    createdAtMs: NOW - 1000,
    completedAtMs,
    completedBy: null,
  };
}

function entry(
  personId: string,
  name: string,
  state: SharedDayEntry['state'],
  taskTitle: string | null,
): SharedDayEntry {
  return {
    member: member(personId, name),
    task:
      taskTitle == null
        ? null
        : task(`t-${personId}`, taskTitle, state === 'done' ? NOW - 10 : null),
    state,
  };
}

interface BandOptions {
  entries?: readonly SharedDayEntry[];
  allDone?: boolean;
  streakDays?: number;
  status?: SharedDayStatus;
  onTakeOne?: () => void;
  onRetry?: () => void;
}

function render({
  entries = [],
  allDone = false,
  streakDays = 0,
  status = 'ok',
  onTakeOne,
  onRetry,
}: BandOptions) {
  let renderer!: ReturnType<typeof create>;

  act(() => {
    renderer = create(
      <ThemeProvider theme={lightTheme}>
        <SharedDayBand
          allDone={allDone}
          copy={copy}
          entries={entries}
          onRetry={onRetry}
          onTakeOne={onTakeOne}
          status={status}
          streakDays={streakDays}
        />
      </ThemeProvider>,
    );
  });

  return renderer.root;
}

function texts(root: ReactTestInstance): string[] {
  return root
    .findAll(isText)
    .flatMap(node =>
      node.children.filter(
        (child): child is string => typeof child === 'string',
      ),
    );
}

/** A host element rendered as `Text`. Compared as a string because that is
 * what the native renderer emits for one. */
function isText(node: ReactTestInstance): boolean {
  return (node.type as unknown) === 'Text';
}

/** Only the host views: a styled component and the view it renders share the
 * same testID, and just one of them carries the resolved style. */
function hosts(
  root: ReactTestInstance,
  match: (node: ReactTestInstance) => boolean,
) {
  return root.findAll(node => typeof node.type === 'string' && match(node));
}

function flatStyle(node: ReactTestInstance): Record<string, unknown> {
  const style = node.props.style as unknown;
  const list = Array.isArray(style) ? style.flat(Infinity) : [style];

  return Object.assign(
    {},
    ...list.filter(item => item != null && typeof item === 'object'),
  );
}

const ALL_FOUR: readonly SharedDayEntry[] = [
  entry('p-3', 'Vera', 'focusing', 'Fechar o roteiro'),
  entry('p-2', 'Rafa', 'open', 'Revisar o preço'),
  entry('p-1', 'Joana', 'done', 'Escrever o convite'),
  entry('p-4', 'Caio', 'absent', null),
];

describe('SharedDayBand', () => {
  // The retry keeps its busy label for a floor of 600ms, so the clock is
  // this test's to move.
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the eyebrow and one line per person, in the order it received', () => {
    const root = render({ entries: ALL_FOUR });
    const rendered = texts(root);

    expect(rendered).toContain(copy.lists.dayBandTitle);
    expect(rendered).toContain('Vera');
    expect(rendered).toContain('Fechar o roteiro');
    expect(rendered).toContain('Revisar o preço');
    expect(rendered).toContain('Escrever o convite');
    // Absent says what it is, without blaming anyone.
    expect(rendered).toContain(copy.lists.dayBandAbsent);
  });

  it('says name, task and state to a screen reader', () => {
    const root = render({ entries: ALL_FOUR });
    const labels = root
      .findAll(node => node.props.accessibilityLabel != null)
      .map(node => node.props.accessibilityLabel as string);

    expect(labels).toContain(
      `Vera, Fechar o roteiro, ${copy.lists.dayBandStateFocusing}`,
    );
    expect(labels).toContain(
      `Rafa, Revisar o preço, ${copy.lists.dayBandStateOpen}`,
    );
    expect(labels).toContain(
      `Joana, Escrever o convite, ${copy.lists.dayBandStateDone}`,
    );
    expect(labels).toContain(`Caio, ${copy.lists.dayBandAbsent}`);
  });

  it('draws a glyph only for focusing and done, hidden from the reader', () => {
    const root = render({ entries: ALL_FOUR });
    const focusing = root.findAllByType(FocusGlyph);
    const done = root.findAllByType(CheckGlyph);

    // One for the person in focus, one for the person who closed. Open and
    // absent carry no glyph at all.
    expect(focusing).toHaveLength(1);
    expect(done).toHaveLength(1);
    expect(focusing[0].props).toMatchObject({
      color: lightTheme.colors.onAccent,
      size: 20,
    });
    expect(done[0].props).toMatchObject({
      color: lightTheme.colors.onAccent,
      size: 16,
    });

    // The state is spoken in the row label, so the glyph itself stays silent.
    const wrappers = hosts(
      root,
      node => node.props.importantForAccessibility === 'no-hide-descendants',
    );
    expect(wrappers.length).toBeGreaterThanOrEqual(2);
  });

  it('marks the absent chip as pending, so it reads as an outline', () => {
    const root = render({ entries: ALL_FOUR });
    const chips = root.findAll(
      node => typeof node.type !== 'string' && node.props.inverted === true,
    );

    expect(chips).toHaveLength(4);
    expect(chips.filter(chip => chip.props.pending === true)).toHaveLength(1);
  });

  it('offers to take one for today when nobody published anything', () => {
    const root = render({ entries: [], onTakeOne: () => undefined });

    expect(texts(root)).toContain(copy.lists.dayBandEmpty);
    expect(root.findByProps({ testID: 'shared-day-take-one' })).toBeTruthy();
  });

  it('does not offer the button when there is nothing for this person to take', () => {
    const root = render({ entries: ALL_FOUR });

    expect(root.findAllByProps({ testID: 'shared-day-take-one' })).toHaveLength(
      0,
    );
  });

  it('celebrates a closed day and only then names the streak', () => {
    const closed = [
      entry('p-1', 'Joana', 'done', 'Escrever o convite'),
      entry('p-2', 'Rafa', 'done', 'Revisar o preço'),
      entry('p-3', 'Vera', 'done', 'Fechar o roteiro'),
    ];

    expect(
      texts(render({ entries: closed, allDone: true, streakDays: 3 })),
    ).toEqual(
      expect.arrayContaining([
        copy.lists.dayBandAllDone(3),
        copy.lists.dayBandStreak(3),
      ]),
    );

    // A single closed day is not a streak yet.
    expect(
      texts(render({ entries: closed, allDone: true, streakDays: 1 })),
    ).not.toContain(copy.lists.dayBandStreak(1));
  });

  it('replaces the lines with the stack when everybody closed', () => {
    const closed = [
      entry('p-1', 'Joana', 'done', 'Escrever o convite'),
      entry('p-2', 'Rafa', 'done', 'Revisar o preço'),
    ];
    const root = render({ entries: closed, allDone: true, streakDays: 4 });
    const rendered = texts(root);

    // One fact, not two lines: no name and no task title survives.
    expect(rendered).not.toContain('Joana');
    expect(rendered).not.toContain('Escrever o convite');
    expect(rendered).toContain(copy.lists.dayBandAllDone(2));

    // The stack is the chips of everyone, the second one clipping the first.
    const chips = root.findAll(
      node => typeof node.type !== 'string' && node.props.inverted === true,
    );
    expect(chips).toHaveLength(2);
    expect(chips.map(chip => chip.props.stacked)).toEqual([false, true]);
    expect(root.findAllByType(CheckGlyph)).toHaveLength(1);
  });

  it('strikes through what is already closed and dims who took nothing', () => {
    const root = render({ entries: ALL_FOUR });
    const struck = hosts(
      root,
      node => flatStyle(node).textDecorationLine === 'line-through',
    );
    const dimmed = hosts(
      root,
      node =>
        isText(node) &&
        flatStyle(node).fontWeight === '700' &&
        flatStyle(node).color === lightTheme.colors.onAccentSubtle,
    );

    expect(struck).toHaveLength(1);
    expect(struck[0].children).toContain('Escrever o convite');
    expect(dimmed).toHaveLength(1);
    expect(dimmed[0].children).toContain('Caio');
  });

  it('draws one rule only, when the streak note already carries it', () => {
    const closed = [entry('p-1', 'Joana', 'done', 'Escrever o convite')];
    const root = render({
      allDone: true,
      entries: closed,
      status: 'offline',
      streakDays: 4,
    });
    const ruled = hosts(
      root,
      node => isText(node) && flatStyle(node).borderTopWidth === 1.5,
    );

    expect(ruled).toHaveLength(1);
    expect(ruled[0].children).toContain(copy.lists.dayBandStreak(4));
  });

  /** The two panels a single account can reach on a device: the empty band
   * and the closed line. Fixed here so the comparison against 6c and 6b
   * survives a cycle where the screenshot could not be collected. */
  it('shows the empty band as a sentence and a button, with no rule', () => {
    const root = render({ entries: [], onTakeOne: () => undefined });
    const empty = hosts(root, node => node.props.testID === 'shared-day-empty');
    const style = flatStyle(empty[empty.length - 1]);

    expect(style.fontSize).toBe(lightTheme.type.body);
    expect(style.borderTopWidth).toBeUndefined();
    expect(texts(root)).toContain(copy.lists.dayBandEmpty);
    expect(root.findByProps({ testID: 'shared-day-take-one' })).toBeTruthy();
  });

  it('marks the closed line, strikes its title and checks it once', () => {
    const root = render({ entries: ALL_FOUR });
    const done = root.findAllByProps({ testID: 'shared-day-row-done' });
    const open = root.findAllByProps({ testID: 'shared-day-row-open' });

    expect(done).not.toHaveLength(0);
    expect(open).not.toHaveLength(0);

    const struck = hosts(
      done[done.length - 1],
      node => flatStyle(node).textDecorationLine === 'line-through',
    );
    expect(struck).toHaveLength(1);
    expect(struck[0].children).toContain('Escrever o convite');
    expect(done[done.length - 1].findAllByType(CheckGlyph)).toHaveLength(1);

    // The open line carries no glyph at all: nothing to say yet.
    expect(open[open.length - 1].findAllByType(CheckGlyph)).toHaveLength(0);
    expect(open[open.length - 1].findAllByType(FocusGlyph)).toHaveLength(0);
  });

  it('draws no rule on an empty band, with nothing above the note', () => {
    const root = render({ entries: [], status: 'offline' });
    const ruled = hosts(
      root,
      node => isText(node) && flatStyle(node).borderTopWidth === 1.5,
    );

    expect(ruled).toHaveLength(0);
    expect(texts(root)).toContain(copy.lists.dayBandOffline);
  });

  it('rules above the offline note, so it reads as an aside', () => {
    const root = render({ entries: ALL_FOUR, status: 'offline' });
    const note = hosts(
      root,
      node => isText(node) && node.children.includes(copy.lists.dayBandOffline),
    )[0];

    expect(flatStyle(note).borderTopWidth).toBe(1.5);
    expect(flatStyle(note).borderTopColor).toBe(lightTheme.colors.onAccentLine);
  });

  it('explains a failed fetch without losing the lines already on the phone', () => {
    const rendered = texts(render({ entries: ALL_FOUR, status: 'offline' }));

    expect(rendered).toContain(copy.lists.dayBandOffline);
    expect(rendered).toContain('Vera');
    expect(rendered).toContain('Escrever o convite');
  });

  it('says nothing about the network once the day was read', () => {
    const rendered = texts(render({ entries: ALL_FOUR, status: 'ok' }));

    expect(rendered).not.toContain(copy.lists.dayBandOffline);
    expect(rendered).not.toContain(copy.lists.dayBandError);
  });

  it('tells a refused day in its own words, never as a missing network', () => {
    const root = render({ entries: ALL_FOUR, status: 'error' });
    const rendered = texts(root);

    expect(rendered).toContain(copy.lists.dayBandError);
    expect(rendered).not.toContain(copy.lists.dayBandOffline);
    expect(root.findByProps({ testID: 'shared-day-error' })).toBeTruthy();
  });

  it('offers asking again, and asks when tapped', () => {
    const onRetry = jest.fn();
    const root = render({ entries: ALL_FOUR, status: 'error', onRetry });
    const retry = root.findByProps({ testID: 'shared-day-retry' });

    act(() => {
      retry.props.onPress();
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('says it is trying while the new attempt is in flight', async () => {
    let settle!: () => void;
    const onRetry = jest.fn(
      () =>
        new Promise<void>(resolve => {
          settle = resolve;
        }),
    );
    const root = render({ entries: ALL_FOUR, status: 'error', onRetry });
    const retry = () => root.findByProps({ testID: 'shared-day-retry' });

    expect(retry().props.accessibilityLabel).toBe(copy.lists.dayBandRetry);

    act(() => {
      retry().props.onPress();
    });

    expect(texts(root)).toContain(copy.lists.dayBandRetrying);
    expect(retry().props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });

    // A second tap while it waits does not stack another attempt.
    act(() => {
      retry().props.onPress();
    });
    expect(onRetry).toHaveBeenCalledTimes(1);

    await act(async () => {
      settle();
      jest.advanceTimersByTime(600);
    });

    expect(texts(root)).not.toContain(copy.lists.dayBandRetrying);
    expect(texts(root)).toContain(copy.lists.dayBandRetryFailed);
  });

  it('offers the action again when the new attempt also fails', async () => {
    const onRetry = jest.fn(() => Promise.reject(new Error('denied')));
    const root = render({ entries: ALL_FOUR, status: 'error', onRetry });

    await act(async () => {
      root.findByProps({ testID: 'shared-day-retry' }).props.onPress();
      jest.advanceTimersByTime(600);
    });

    expect(texts(root)).toContain(copy.lists.dayBandRetryFailed);
    expect(texts(root)).toContain(copy.lists.dayBandError);

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    expect(texts(root)).toContain(copy.lists.dayBandRetry);
  });

  it('holds the busy label through an instant refusal', async () => {
    const onRetry = jest.fn(() => Promise.reject(new Error('denied')));
    const root = render({ entries: ALL_FOUR, status: 'error', onRetry });

    await act(async () => {
      root.findByProps({ testID: 'shared-day-retry' }).props.onPress();
    });

    // The server already said no, and the label is still saying it tried.
    expect(texts(root)).toContain(copy.lists.dayBandRetrying);

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    expect(texts(root)).not.toContain(copy.lists.dayBandRetrying);
  });

  it('admits the second refusal in the label, then offers the plain action', async () => {
    const onRetry = jest.fn(() => Promise.resolve());
    const root = render({ entries: ALL_FOUR, status: 'error', onRetry });

    await act(async () => {
      root.findByProps({ testID: 'shared-day-retry' }).props.onPress();
      jest.advanceTimersByTime(600);
    });

    // The status is still 'error': the band went and asked, and says so.
    expect(texts(root)).toContain(copy.lists.dayBandRetryFailed);
    expect(
      root.findByProps({ testID: 'shared-day-retry' }).props.accessibilityLabel,
    ).toBe(copy.lists.dayBandRetryFailed);

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    expect(texts(root)).toContain(copy.lists.dayBandRetry);
    expect(texts(root)).not.toContain(copy.lists.dayBandRetryFailed);
  });

  it('announces the error note when it lands', () => {
    const note = render({ entries: ALL_FOUR, status: 'error' }).findByProps({
      testID: 'shared-day-error',
    });

    expect(note.props.accessibilityLiveRegion).toBe('polite');
    expect(note.props.accessibilityRole).toBe('alert');
  });

  it('never claims an empty day it could not read, but still says what the band is', () => {
    const root = render({ entries: [], status: 'error' });

    expect(
      hosts(root, node => node.props.testID === 'shared-day-empty'),
    ).toHaveLength(0);
    expect(texts(root)).not.toContain(copy.lists.dayBandEmpty);
    expect(texts(root)).toContain(copy.lists.dayBandEmptyHint);
  });

  it('explains the band on an offline day too', () => {
    const rendered = texts(render({ entries: [], status: 'offline' }));

    expect(rendered).toContain(copy.lists.dayBandEmptyHint);
    expect(rendered).toContain(copy.lists.dayBandOffline);
    expect(rendered).not.toContain(copy.lists.dayBandEmpty);
  });

  it('explains what the band is for, under the empty sentence', () => {
    const rendered = texts(render({ entries: [], status: 'ok' }));

    expect(rendered).toContain(copy.lists.dayBandEmpty);
    expect(rendered).toContain(copy.lists.dayBandEmptyHint);
  });

  it('bleeds to both edges over a sun ground', () => {
    const root = render({ entries: ALL_FOUR });
    const style = flatStyle(
      hosts(root, node => node.props.testID === 'shared-day-band')[0],
    );

    expect(style.backgroundColor).toBe(lightTheme.colors.accent);
    expect(style.marginRight).toBe(-lightTheme.spacing.large);
    expect(style.marginLeft).toBe(
      -(lightTheme.spacing.large + lightTheme.spacing.small),
    );
    expect(style.borderRadius).toBeUndefined();
  });

  it('rules between lines and never above the first one', () => {
    const root = render({ entries: ALL_FOUR });
    const rows = hosts(
      root,
      node => typeof node.props.accessibilityLabel === 'string',
    ).filter(node => flatStyle(node).borderTopWidth != null);

    expect(rows.map(node => flatStyle(node).borderTopWidth)).toEqual([
      0, 1.5, 1.5, 1.5,
    ]);
    expect(flatStyle(rows[1]).borderTopColor).toBe(
      lightTheme.colors.onAccentLine,
    );
  });

  it('inverts ink and sun on the one control that decides something', () => {
    const root = render({ entries: [], onTakeOne: () => undefined });

    // Ink ground, in both modes: `text` goes cream in the dark theme and the
    // yellow label would vanish on it.
    expect(
      hosts(
        root,
        node => flatStyle(node).backgroundColor === lightTheme.colors.onAccent,
      ),
    ).not.toHaveLength(0);
    expect(
      hosts(
        root,
        node =>
          isText(node) && flatStyle(node).color === lightTheme.colors.accent,
      ),
    ).not.toHaveLength(0);
  });
});
