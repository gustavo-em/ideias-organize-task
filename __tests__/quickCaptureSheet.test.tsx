import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { lightTheme } from '../src/app/theme/theme';
import type { TaskList } from '../src/features/tasks/domain/TaskList';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';
import { QuickCaptureSheet } from '../src/features/tasks/presentation/views/QuickCaptureSheet';

/**
 * The sheet opens on its smallest layer.
 *
 * Everything below is about what is on screen before anything is tapped: a
 * field, two ways in, and whatever the text was already understood as.
 */

const copy = getTaskCopy('pt-BR');
const NOW = new Date(2026, 8, 1, 10, 0, 0).getTime();
const LISTS: readonly TaskList[] = [];

function renderSheet(
  props: Partial<React.ComponentProps<typeof QuickCaptureSheet>> = {},
) {
  let tree!: ReturnType<typeof create>;

  act(() => {
    tree = create(
      <ThemeProvider theme={lightTheme}>
        <QuickCaptureSheet
          copy={copy}
          language="pt-BR"
          lists={LISTS}
          nowMs={NOW}
          onCancel={() => {}}
          onSubmit={() => {}}
          {...props}
        />
      </ThemeProvider>,
    );
  });

  return tree;
}

function byId(
  tree: ReturnType<typeof create>,
  id: string,
): ReactTestInstance[] {
  return tree.root.findAll(
    node => node.props?.testID === id && typeof node.type !== 'string',
  );
}

/** The same testID appears on the styled wrapper and on what it renders, so
 * presence is what is asserted, and the outermost node is what is pressed. */
function has(tree: ReturnType<typeof create>, id: string): boolean {
  return byId(tree, id).length > 0;
}

function first(tree: ReturnType<typeof create>, id: string): ReactTestInstance {
  return byId(tree, id)[0];
}

function texts(tree: ReturnType<typeof create>): string[] {
  return tree.root
    .findAll(node => typeof node.type === 'string' && node.props?.children)
    .flatMap(node =>
      typeof node.props.children === 'string' ? [node.props.children] : [],
    );
}

describe('QuickCaptureSheet layers', () => {
  it('opens on layer zero: field, two controls, no chips or hints', () => {
    const tree = renderSheet();

    expect(has(tree, 'capture-field')).toBe(true);
    expect(has(tree, 'capture-more')).toBe(true);
    expect(has(tree, 'capture-syntax')).toBe(true);
    expect(has(tree, 'capture-save')).toBe(true);
    expect(has(tree, 'capture-chip-date')).toBe(false);
    expect(has(tree, 'capture-chip-priority')).toBe(false);
    expect(has(tree, 'capture-chip-list')).toBe(false);
    expect(texts(tree)).not.toContain(copy.capture.hint);
    expect(texts(tree)).not.toContain(copy.capture.syntaxTitle);
  });

  it('reveals the chips the text resolved, without being expanded', () => {
    const tree = renderSheet();

    act(() => {
      first(tree, 'capture-field').props.onChangeText('amanhã urgente');
    });

    expect(has(tree, 'capture-chip-date')).toBe(true);
    expect(has(tree, 'capture-chip-priority')).toBe(true);
    expect(has(tree, 'capture-chip-list')).toBe(false);
    expect(texts(tree)).not.toContain(copy.capture.hint);
  });

  it('expands and collapses on the same control', () => {
    const tree = renderSheet();
    const toggle = () => first(tree, 'capture-more');

    expect(toggle().props.accessibilityState).toEqual({ expanded: false });
    expect(toggle().props.accessibilityLabel).toBe(copy.capture.moreOptions);

    act(() => toggle().props.onPress());

    expect(toggle().props.accessibilityState).toEqual({ expanded: true });
    expect(toggle().props.accessibilityLabel).toBe(copy.capture.lessOptions);
    expect(has(tree, 'capture-chip-date')).toBe(true);
    expect(has(tree, 'capture-chip-priority')).toBe(true);
    expect(has(tree, 'capture-chip-list')).toBe(true);
    expect(texts(tree)).toContain(copy.capture.hint);

    act(() => toggle().props.onPress());

    expect(has(tree, 'capture-chip-date')).toBe(false);
    expect(texts(tree)).not.toContain(copy.capture.hint);
  });

  it('takes an open panel down with the layer that opened it', () => {
    const tree = renderSheet();

    act(() => first(tree, 'capture-more').props.onPress());
    act(() => first(tree, 'capture-chip-date').props.onPress());

    expect(has(tree, 'calendar-next')).toBe(true);

    act(() => first(tree, 'capture-more').props.onPress());

    expect(has(tree, 'calendar-next')).toBe(false);
    expect(has(tree, 'capture-chip-date')).toBe(false);
  });

  it('opens the writing shortcuts in the panel slot, never beside the hint', () => {
    const tree = renderSheet();

    act(() => first(tree, 'capture-more').props.onPress());
    act(() => first(tree, 'capture-syntax').props.onPress());

    expect(texts(tree)).toContain(copy.capture.syntaxTitle);
    expect(texts(tree)).toContain(copy.capture.syntaxHelp);
    expect(texts(tree)).not.toContain(copy.capture.hint);
    expect(first(tree, 'capture-syntax').props.accessibilityState).toEqual({
      expanded: true,
    });

    act(() => first(tree, 'capture-syntax').props.onPress());

    expect(texts(tree)).not.toContain(copy.capture.syntaxTitle);
    expect(texts(tree)).toContain(copy.capture.hint);
  });

  it('editing opens expanded, with the edit hint and no shortcuts', () => {
    const tree = renderSheet({
      editing: {
        title: 'ligar pro contador',
        priority: 'medium',
        dueAtMs: null,
        listId: null,
      },
    });

    expect(has(tree, 'capture-chip-date')).toBe(true);
    expect(has(tree, 'capture-chip-priority')).toBe(true);
    expect(has(tree, 'capture-chip-list')).toBe(true);
    expect(texts(tree)).toContain(copy.capture.editHint);
    expect(has(tree, 'capture-syntax')).toBe(false);
  });
});
