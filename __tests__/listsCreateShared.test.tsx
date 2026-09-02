import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { lightTheme } from '../src/app/theme/theme';
import type { TaskList } from '../src/features/tasks/domain/TaskList';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';
import { ListsScreen } from '../src/features/tasks/presentation/screens/ListsScreen';
import type { TasksViewModel } from '../src/features/tasks/presentation/view-models/useTasksViewModel';

// Deciding "shared" happens in the editor sheet; the test drives that one
// control directly instead of pulling the whole sheet — and its native
// modules — into this file.
jest.mock('../src/features/tasks/presentation/views/ListNameSheet', () => {
  const { Pressable } = require('react-native');
  const { createElement } = require('react');

  return {
    ProjectEditorSheet: ({
      shareOption,
      onSubmit,
    }: {
      shareOption?: { value: boolean; onChange: (value: boolean) => void };
      onSubmit: (
        name: string,
        appearance: { color: string; icon: string },
      ) => boolean;
    }) =>
      createElement(
        Pressable,
        { testID: 'mock-editor-sheet' },
        createElement(Pressable, {
          onPress: () => shareOption?.onChange(!shareOption.value),
          testID: 'mock-toggle-shared',
        }),
        createElement(Pressable, {
          onPress: () =>
            onSubmit('Lançamento', { color: 'sun', icon: 'layers' }),
          testID: 'mock-submit',
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
jest.mock('../src/features/tasks/presentation/views/JoinInviteSheet', () => {
  const { View } = require('react-native');
  const { createElement } = require('react');

  return {
    JoinInviteSheet: () => createElement(View, { testID: 'mock-join-sheet' }),
  };
});
jest.mock('../src/features/tasks/presentation/views/QuickCaptureSheet', () => ({
  QuickCaptureSheet: () => null,
}));
jest.mock('../src/features/tasks/presentation/views/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));
jest.mock('../src/features/tasks/presentation/views/TaskCard', () => ({
  TaskCard: () => null,
}));

const copy = getTaskCopy('pt-BR');
const NOW = new Date(2026, 8, 1, 10, 0, 0).getTime();

const created: TaskList = {
  id: 'lancamento',
  name: 'Lançamento',
  color: 'sun',
  icon: 'layers',
};

function render(overrides: Partial<TasksViewModel> = {}) {
  const viewModel = {
    nowMs: NOW,
    lists: [],
    tasks: [],
    openTaskCount: 0,
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
    createList: () => created,
    createShareLink: () => undefined,
    moveIntoDay: () => undefined,
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

describe('creating a project that is already a group', () => {
  it('asks for the link and shows the invite right after saving', () => {
    const calls: Array<[string, string]> = [];
    const root = render({
      createShareLink: (listId: string, role: string) => {
        calls.push([listId, role]);
      },
    } as unknown as Partial<TasksViewModel>);

    press(root, 'new-list');
    press(root, 'mock-toggle-shared');
    press(root, 'mock-submit');

    expect(calls).toEqual([['lancamento', 'editor']]);
    expect(has(root, 'mock-share-sheet')).toBe(true);
  });

  it('leaves the project local when the option stays off', () => {
    const calls: string[] = [];
    const root = render({
      createShareLink: (listId: string) => {
        calls.push(listId);
      },
    } as unknown as Partial<TasksViewModel>);

    press(root, 'new-list');
    press(root, 'mock-submit');

    expect(calls).toEqual([]);
    expect(has(root, 'mock-share-sheet')).toBe(false);
  });

  it('keeps the way in for whoever arrives with a link', () => {
    const root = render();

    expect(has(root, 'join-invite')).toBe(true);

    press(root, 'join-invite');

    expect(has(root, 'mock-join-sheet')).toBe(true);
  });
});
