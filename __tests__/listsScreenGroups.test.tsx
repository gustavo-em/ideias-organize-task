import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { lightTheme } from '../src/app/theme/theme';
import { endOfDay } from '../src/features/tasks/domain/Day';
import type { Task } from '../src/features/tasks/domain/Task';
import type { TaskGroup } from '../src/features/tasks/domain/TaskGroup';
import type { TaskList } from '../src/features/tasks/domain/TaskList';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';
import { ListsScreen } from '../src/features/tasks/presentation/screens/ListsScreen';
import type { TasksViewModel } from '../src/features/tasks/presentation/view-models/useTasksViewModel';

// The two sheets are driven directly: what this test is about is the screen
// deciding which one opens and with what, not the native pieces inside them.
jest.mock('../src/features/tasks/presentation/views/QuickCaptureSheet', () => {
  const { Pressable } = require('react-native');
  const { createElement } = require('react');

  return {
    QuickCaptureSheet: ({
      initialGroupId = null,
      onChooseGroup,
    }: {
      initialGroupId?: string | null;
      onChooseGroup?: () => void;
    }) =>
      createElement(
        Pressable,
        {
          testID:
            initialGroupId == null
              ? 'mock-capture'
              : `mock-capture-in-${initialGroupId}`,
        },
        onChooseGroup == null
          ? null
          : createElement(Pressable, {
              onPress: onChooseGroup,
              testID: 'mock-capture-choose-group',
            }),
      ),
  };
});
jest.mock('../src/features/tasks/presentation/views/GroupEditorSheet', () => {
  const { Pressable } = require('react-native');
  const { createElement } = require('react');

  return {
    GroupEditorSheet: ({
      spaceName,
      onSubmit,
    }: {
      spaceName: string;
      onSubmit: (draft: unknown) => boolean;
    }) =>
      createElement(
        Pressable,
        { testID: `mock-group-sheet-${spaceName}` },
        createElement(Pressable, {
          onPress: () =>
            onSubmit({
              name: 'Aniversário da vó Cida',
              color: 'coral',
              icon: 'cake',
              eventAtMs: null,
            }),
          testID: 'mock-group-submit',
        }),
      ),
  };
});
jest.mock('../src/features/tasks/presentation/views/ShareSheet', () => {
  const { View } = require('react-native');
  const { createElement } = require('react');

  return {
    ShareSheet: () => createElement(View, { testID: 'mock-share-sheet' }),
  };
});
jest.mock('../src/features/tasks/presentation/views/JoinInviteSheet', () => ({
  JoinInviteSheet: () => null,
}));
jest.mock('../src/features/tasks/presentation/views/ListNameSheet', () => ({
  ProjectEditorSheet: () => null,
}));
jest.mock('../src/features/tasks/presentation/views/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

const copy = getTaskCopy('pt-BR');
const NOW = new Date(2026, 9, 6, 10, 0).getTime();
const EVENT = endOfDay(new Date(2026, 9, 18, 12, 0).getTime());

const birthday: TaskGroup = {
  id: 'g-1',
  listId: 'familia',
  name: 'Aniversário da vó Cida',
  icon: 'cake',
  color: 'coral',
  eventAtMs: EVENT,
  createdAtMs: NOW,
};

const family: TaskList = {
  id: 'familia',
  name: 'Família',
  color: 'coral',
  icon: 'home',
  groups: [birthday],
};

function task(id: string, groupId: string | null): Task {
  return {
    id,
    title: id,
    listId: 'familia',
    groupId,
    priority: 'medium',
    dueAtMs: null,
    estimatedMinutes: null,
    createdAtMs: NOW,
    completedAtMs: null,
    subtasks: [],
    kind: 'task',
  };
}

const tasks = [task('salao', 'g-1'), task('almoco', null)];

function render(overrides: Partial<TasksViewModel> = {}) {
  const viewModel = {
    nowMs: NOW,
    lists: [family],
    tasks,
    openTaskCount: 2,
    identity: { personId: 'p-1', name: 'Joana' },
    sharedDays: {},
    sharedDayStatus: {},
    groupStreaks: {},
    shareStatus: 'idle',
    shareErrorKind: null,
    joinStatus: 'idle',
    joinErrorKind: null,
    refreshAllSharedLists: () => Promise.resolve([]),
    refreshSharedList: () => Promise.resolve(),
    listOf: (id: string) => (id === 'familia' ? family : null),
    createGroup: () => birthday,
    editGroup: () => true,
    deleteGroup: () => undefined,
    capture: () => undefined,
    toggle: () => undefined,
    ...overrides,
  } as unknown as TasksViewModel;
  let renderer!: ReturnType<typeof create>;

  act(() => {
    renderer = create(
      <ThemeProvider theme={lightTheme}>
        <ListsScreen
          copy={copy}
          language="pt-BR"
          notificationPrompt={{
            visible: false,
            onEnable: async () => false,
            onDismiss: () => undefined,
          }}
          ownProfile={null}
          viewModel={viewModel}
        />
      </ThemeProvider>,
    );
  });

  return renderer.root;
}

function press(root: ReactTestInstance, testID: string) {
  const target = root.findAll(
    node => node.props.testID === testID && node.props.onPress != null,
  )[0];

  act(() => {
    target.props.onPress();
  });
}

function has(root: ReactTestInstance, testID: string) {
  return root.findAll(node => node.props.testID === testID).length > 0;
}

describe('groups inside a space', () => {
  it('draws the group as a block and keeps its tasks out of the loose lines', () => {
    const root = render();

    press(root, 'list-familia');

    expect(has(root, 'group-g-1')).toBe(true);
    expect(has(root, 'task-almoco')).toBe(true);
    // The group's own task lives in the block, not twice on the screen.
    expect(has(root, 'task-salao')).toBe(false);
  });

  it('opens the group on its own screen and back onto the space', () => {
    const root = render();

    press(root, 'list-familia');
    press(root, 'group-g-1');

    expect(has(root, 'group-screen-g-1')).toBe(true);
    expect(has(root, 'task-salao')).toBe(true);
    // Inside the group the plus names what it makes.
    expect(has(root, 'add-task-in-group-fab')).toBe(true);
    expect(has(root, 'add-task-fab')).toBe(false);

    press(root, 'group-back-g-1');

    expect(has(root, 'group-screen-g-1')).toBe(false);
    expect(has(root, 'group-g-1')).toBe(true);
  });

  it('creates inside the group when the plus is pressed there', () => {
    const root = render();

    press(root, 'list-familia');
    press(root, 'group-g-1');
    press(root, 'add-task-in-group-fab');

    expect(has(root, 'mock-capture-in-g-1')).toBe(true);
  });

  it('makes a group from the space and opens it', () => {
    const created: unknown[] = [];
    const root = render({
      createGroup: ((listId: string, draft: unknown) => {
        created.push([listId, draft]);
        return birthday;
      }) as TasksViewModel['createGroup'],
    });

    press(root, 'list-familia');
    press(root, 'add-group-familia');

    expect(has(root, 'mock-group-sheet-Família')).toBe(true);

    press(root, 'mock-group-submit');

    expect(created).toEqual([
      [
        'familia',
        {
          name: 'Aniversário da vó Cida',
          color: 'coral',
          icon: 'cake',
          eventAtMs: null,
        },
      ],
    ]);
    expect(has(root, 'group-screen-g-1')).toBe(true);
  });

  it('offers the group as a third kind in the capture sheet of a space', () => {
    const root = render();

    press(root, 'list-familia');
    press(root, 'add-task-familia');

    expect(has(root, 'mock-capture')).toBe(true);

    press(root, 'mock-capture-choose-group');

    expect(has(root, 'mock-capture')).toBe(false);
    expect(has(root, 'mock-group-sheet-Família')).toBe(true);
  });
});
