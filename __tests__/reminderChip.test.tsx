import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { lightTheme } from '../src/app/theme/theme';
import { endOfDay } from '../src/features/tasks/domain/Day';
import type { Subtask } from '../src/features/tasks/domain/Subtask';
import type { TaskList } from '../src/features/tasks/domain/TaskList';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';
import { QuickCaptureSheet } from '../src/features/tasks/presentation/views/QuickCaptureSheet';

/**
 * Asking to be warned before a deadline, from the task itself.
 *
 * Everything here is about what the sheet offers: the control only exists
 * where there is a date to count back from, and it never offers a lead time
 * the date cannot hold.
 */

const copy = getTaskCopy('pt-BR');
const NOW = new Date(2026, 8, 1, 10, 0, 0).getTime();
const LISTS: readonly TaskList[] = [];
const NO_SUBTASKS: readonly Subtask[] = [];

function dueInDays(days: number): number {
  const due = new Date(NOW);
  due.setDate(due.getDate() + days);
  return endOfDay(due.getTime());
}

function renderEditing(
  subject: Partial<React.ComponentProps<typeof QuickCaptureSheet>['editing']>,
  onSubmit: React.ComponentProps<
    typeof QuickCaptureSheet
  >['onSubmit'] = () => {},
) {
  let tree!: ReturnType<typeof create>;

  act(() => {
    tree = create(
      <ThemeProvider theme={lightTheme}>
        <QuickCaptureSheet
          copy={copy}
          editing={{
            id: 'task-1',
            title: 'entregar relatório',
            priority: 'medium',
            dueAtMs: dueInDays(5),
            listId: null,
            remindDaysBefore: null,
            subtasks: NO_SUBTASKS,
            ...subject,
          }}
          language="pt-BR"
          lists={LISTS}
          nowMs={NOW}
          onCancel={() => {}}
          onSubmit={onSubmit}
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

function has(tree: ReturnType<typeof create>, id: string): boolean {
  return byId(tree, id).length > 0;
}

function press(tree: ReturnType<typeof create>, id: string): void {
  act(() => {
    byId(tree, id)[0].props.onPress();
  });
}

function texts(tree: ReturnType<typeof create>): string[] {
  return tree.root
    .findAll(node => typeof node.type === 'string' && node.props?.children)
    .flatMap(node =>
      typeof node.props.children === 'string' ? [node.props.children] : [],
    );
}

describe('asking to be warned before a deadline', () => {
  it('offers one option per day that fits between today and the date', () => {
    const tree = renderEditing({ dueAtMs: dueInDays(5) });

    press(tree, 'capture-chip-reminder');

    expect(has(tree, 'reminder-option-none')).toBe(true);
    expect(has(tree, 'reminder-option-1')).toBe(true);
    expect(has(tree, 'reminder-option-5')).toBe(true);
    expect(has(tree, 'reminder-option-6')).toBe(false);
  });

  it('never offers a lead time the date cannot hold', () => {
    const tree = renderEditing({ dueAtMs: dueInDays(2) });

    press(tree, 'capture-chip-reminder');

    expect(has(tree, 'reminder-option-2')).toBe(true);
    expect(has(tree, 'reminder-option-3')).toBe(false);
  });

  it('says so on the chip, disabled, when the deadline is today', () => {
    const tree = renderEditing({ dueAtMs: dueInDays(0) });
    const chip = byId(tree, 'capture-chip-reminder')[0];

    expect(chip.props.disabled).toBe(true);
    expect(chip.props.accessibilityState).toMatchObject({ disabled: true });
    expect(texts(tree)).toContain(copy.capture.reminder.noLeadTime);
    expect(has(tree, 'reminder-option-1')).toBe(false);
  });

  it('has no control at all on a task without a date', () => {
    const tree = renderEditing({ dueAtMs: null });

    expect(has(tree, 'capture-chip-reminder')).toBe(false);
  });

  it('shows the chosen lead time on the chip and saves it', () => {
    const submitted: unknown[] = [];
    const tree = renderEditing({ dueAtMs: dueInDays(5) }, (_typed, overrides) =>
      submitted.push(overrides),
    );

    expect(texts(tree)).toContain(copy.capture.reminder.off);

    press(tree, 'capture-chip-reminder');
    press(tree, 'reminder-option-2');

    // Printed short so it fits the row; spoken in full for a screen reader.
    expect(texts(tree)).toContain(copy.capture.reminder.daysBefore(2));
    expect(
      byId(tree, 'capture-chip-reminder')[0].props.accessibilityLabel,
    ).toBe(`${copy.capture.reminder.label}: ${copy.capture.reminder.on(2)}`);

    press(tree, 'capture-save');

    expect(submitted[0]).toMatchObject({ remindDaysBefore: 2 });
  });

  it('keeps every chip at its own width, so none is squeezed off the row', () => {
    const tree = renderEditing({ dueAtMs: dueInDays(5) });

    for (const id of [
      'capture-chip-date',
      'capture-chip-priority',
      'capture-chip-list',
      'capture-chip-reminder',
    ]) {
      // The innermost node carrying the id is the Pressable the styles landed
      // on; the styled wrappers above it only pass them down.
      const nodes = byId(tree, id);
      const chip = nodes[nodes.length - 1];
      const style = Object.assign(
        {},
        ...[chip.props.style].flat(Infinity).filter(Boolean),
      );

      expect(style.flexShrink).toBe(0);
      // The design draws a 32px pill inside a 48px slot. Vertical hit slop
      // keeps the real target at the Android minimum without making it bulky.
      expect(style.minHeight).toBe(32);
      expect(
        Number(style.minHeight) +
          chip.props.hitSlop.top +
          chip.props.hitSlop.bottom,
      ).toBeGreaterThanOrEqual(48);
    }
  });

  it('stands right after the date, which is what it counts back from', () => {
    const tree = renderEditing({ dueAtMs: dueInDays(5) });
    const order = tree.root
      .findAll(node => typeof node.props?.testID === 'string')
      .map(node => node.props.testID as string)
      .filter(id => id.startsWith('capture-chip-'));

    expect(order.indexOf('capture-chip-reminder')).toBeGreaterThan(
      order.indexOf('capture-chip-date'),
    );
    expect(order.indexOf('capture-chip-reminder')).toBeLessThan(
      order.indexOf('capture-chip-priority'),
    );
  });

  it('shrinks a saved lead time the date no longer holds', () => {
    const tree = renderEditing({
      dueAtMs: dueInDays(1),
      remindDaysBefore: 5,
    });

    expect(texts(tree)).toContain(copy.capture.reminder.daysBefore(1));
  });
});
