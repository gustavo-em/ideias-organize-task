import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { lightTheme } from '../src/app/theme/theme';
import type { Task } from '../src/features/tasks/domain/Task';
import type { ListMember } from '../src/features/tasks/domain/TaskList';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';
import type { SharedDayEntry } from '../src/features/tasks/presentation/models/sharedDay';
import {
  CheckGlyph,
  PlayGlyph,
} from '../src/features/tasks/presentation/views/FieldGlyphs';
import { SharedDayBand } from '../src/features/tasks/presentation/views/SharedDayBand';

const copy = getTaskCopy('pt-BR');
const NOW = new Date(2026, 8, 1, 10, 0, 0).getTime();

function member(personId: string, name: string): ListMember {
  return { personId, name, role: 'editor', joined: true };
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
  offline?: boolean;
  onTakeOne?: () => void;
}

function render({
  entries = [],
  allDone = false,
  streakDays = 0,
  offline = false,
  onTakeOne,
}: BandOptions) {
  let renderer!: ReturnType<typeof create>;

  act(() => {
    renderer = create(
      <ThemeProvider theme={lightTheme}>
        <SharedDayBand
          allDone={allDone}
          copy={copy}
          entries={entries}
          offline={offline}
          onTakeOne={onTakeOne}
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
    const focusing = root.findAllByType(PlayGlyph);
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

  it('explains a failed fetch without losing the lines already on the phone', () => {
    const rendered = texts(render({ entries: ALL_FOUR, offline: true }));

    expect(rendered).toContain(copy.lists.dayBandOffline);
    expect(rendered).toContain('Vera');
    expect(rendered).toContain('Escrever o convite');
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
