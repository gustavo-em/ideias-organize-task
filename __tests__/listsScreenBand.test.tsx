import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { lightTheme } from '../src/app/theme/theme';
import {
  dayKeyOf,
  type SharedMemberDay,
} from '../src/features/tasks/domain/SharedMemberDay';
import type { Task } from '../src/features/tasks/domain/Task';
import type { TaskList } from '../src/features/tasks/domain/TaskList';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';
import { ListsScreen } from '../src/features/tasks/presentation/screens/ListsScreen';
import type { TasksViewModel } from '../src/features/tasks/presentation/view-models/useTasksViewModel';

// Only the list itself is under test here: the sheets and dialogs live in
// their own files and drag native modules in with them.
jest.mock('../src/features/tasks/presentation/views/ListNameSheet', () => ({
  ProjectEditorSheet: () => null,
}));
// Stands in for the sheet with the one control this test drives: creating
// the link is what turns a project into a shared one.
jest.mock('../src/features/tasks/presentation/views/ShareSheet', () => {
  const { Pressable } = require('react-native');
  const { createElement } = require('react');

  return {
    ShareSheet: ({
      onCreateLink,
    }: {
      onCreateLink: (role: 'editor' | 'viewer') => void;
    }) =>
      createElement(Pressable, {
        onPress: () => onCreateLink('editor'),
        testID: 'mock-create-link',
      }),
  };
});
jest.mock('../src/features/tasks/presentation/views/JoinInviteSheet', () => ({
  JoinInviteSheet: () => null,
}));
jest.mock('../src/features/tasks/presentation/views/QuickCaptureSheet', () => ({
  QuickCaptureSheet: () => null,
}));
jest.mock('../src/features/tasks/presentation/views/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));
jest.mock('../src/features/tasks/presentation/views/FloatingAction', () => ({
  FloatingAction: () => null,
}));
// The card has its own exit and layout animations; this test is about what
// sits above the cards, so it stands in for one with its title.
jest.mock('../src/features/tasks/presentation/views/TaskCard', () => {
  const { Text } = require('react-native');
  const { createElement } = require('react');

  return {
    TaskCard: ({ task }: { task: { title: string } }) =>
      createElement(Text, null, task.title),
  };
});

const copy = getTaskCopy('pt-BR');
const NOW = new Date(2026, 8, 1, 10, 0, 0).getTime();
const ME = 'p-1';

const sharedList: TaskList = {
  id: 'lancamento',
  name: 'Lançamento',
  color: 'sun',
  icon: 'layers',
  share: {
    token: 'tok-1',
    invitedAs: 'editor',
    members: [
      {
        personId: ME,
        name: 'Joana',
        handle: null,
        role: 'owner',
        joined: true,
      },
      {
        personId: 'p-2',
        name: 'Rafa',
        handle: null,
        role: 'editor',
        joined: true,
      },
    ],
  },
};

const soloList: TaskList = {
  id: 'pessoal',
  name: 'Pessoal',
  color: 'sun',
  icon: 'layers',
};

const task: Task = {
  id: 't-1',
  title: 'Escrever o convite',
  listId: 'lancamento',
  priority: 'medium',
  dueAtMs: null,
  estimatedMinutes: null,
  createdAtMs: NOW - 1000,
  completedAtMs: null,
  completedBy: null,
};

const days: readonly SharedMemberDay[] = [
  {
    personId: ME,
    dayKey: dayKeyOf(NOW),
    taskIds: ['t-1'],
    focusTaskId: null,
    updatedAtMs: NOW,
  },
];

function viewModelFor(
  list: TaskList,
  overrides: Partial<TasksViewModel> = {},
): TasksViewModel {
  return {
    nowMs: NOW,
    lists: [list],
    tasks: list.id === 'lancamento' ? [task] : [{ ...task, listId: list.id }],
    openTaskCount: 1,
    identity: { personId: ME, name: 'Joana' },
    sharedDays: { [list.id]: days.map(day => ({ ...day })) },
    sharedDayStatus: {},
    groupStreaks: {},
    shareStatus: 'idle',
    shareErrorKind: null,
    joinStatus: 'idle',
    joinErrorKind: null,
    refreshAllSharedLists: () => Promise.resolve([]),
    refreshSharedList: () => Promise.resolve(),
    createShareLink: () => undefined,
    moveIntoDay: () => undefined,
    toggle: () => undefined,
    ...overrides,
  } as unknown as TasksViewModel;
}

function render(list: TaskList, overrides: Partial<TasksViewModel> = {}) {
  let renderer!: ReturnType<typeof create>;

  act(() => {
    renderer = create(
      <ThemeProvider theme={lightTheme}>
        <ListsScreen
          copy={copy}
          language="pt-BR"
          ownProfile={null}
          viewModel={viewModelFor(list, overrides)}
        />
      </ThemeProvider>,
    );
  });

  return renderer.root;
}

function open(root: ReactTestInstance, list: TaskList) {
  const row = root.findAll(
    node =>
      node.props.testID === `list-${list.id}` && node.props.onPress != null,
  )[0];

  act(() => {
    row.props.onPress();
  });
}

function texts(root: ReactTestInstance): string[] {
  return root
    .findAll(node => (node.type as unknown) === 'Text')
    .flatMap(node =>
      node.children.filter(
        (child): child is string => typeof child === 'string',
      ),
    );
}

function press(root: ReactTestInstance, testID: string) {
  const target = root.findAll(
    node => node.props.testID === testID && node.props.onPress != null,
  )[0];

  act(() => {
    target.props.onPress();
  });
}

describe('the band inside the lists screen', () => {
  it('opens a shared project with the day band on top', () => {
    const root = render(sharedList);

    expect(root.findAllByProps({ testID: 'shared-day-band' })).toHaveLength(0);

    open(root, sharedList);

    expect(
      root.findAll(
        node =>
          typeof node.type === 'string' &&
          node.props.testID === 'shared-day-band',
      ).length,
    ).toBeGreaterThan(0);
    expect(texts(root)).toContain(copy.lists.dayBandTitle);
  });

  it('opens the project it just shared, so the band is already on screen', () => {
    const root = render(sharedList);

    // Straight from the collapsed card: kebab, Compartilhar, Criar link.
    press(root, `list-actions-${sharedList.id}`);
    press(root, 'list-share');
    press(root, 'mock-create-link');

    expect(
      root.findAll(
        node =>
          typeof node.type === 'string' &&
          node.props.testID === 'shared-day-band',
      ).length,
    ).toBeGreaterThan(0);
    expect(texts(root)).toContain(copy.lists.dayBandTitle);
  });

  it('asks the same project again when the day could not be read', async () => {
    jest.useFakeTimers();
    const refreshSharedList = jest.fn(() => Promise.resolve());
    const root = render(sharedList, {
      sharedDayStatus: { [sharedList.id]: 'error' },
      refreshSharedList,
    } as unknown as Partial<TasksViewModel>);

    open(root, sharedList);

    expect(texts(root)).toContain(copy.lists.dayBandError);
    expect(texts(root)).not.toContain(copy.lists.dayBandOffline);

    press(root, 'shared-day-retry');

    expect(refreshSharedList).toHaveBeenCalledWith(sharedList.id);

    // The band holds a busy label for a floor of 600ms: let it end inside
    // the test instead of after the environment is gone.
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    // And the few seconds in which the label admits the second refusal.
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    jest.useRealTimers();
  });

  it('carries no warning once the day was read', () => {
    const root = render(sharedList, {
      sharedDayStatus: { [sharedList.id]: 'ok' },
    } as unknown as Partial<TasksViewModel>);

    open(root, sharedList);

    const rendered = texts(root);
    expect(rendered).toContain(copy.lists.dayBandTitle);
    expect(rendered).not.toContain(copy.lists.dayBandError);
    expect(rendered).not.toContain(copy.lists.dayBandOffline);
  });

  it('opens a project of your own with no band and nothing in its place', () => {
    const root = render(soloList);

    open(root, soloList);

    expect(
      root.findAll(node => node.props.testID === 'shared-day-band'),
    ).toHaveLength(0);
    expect(texts(root)).not.toContain(copy.lists.dayBandTitle);
    // The tasks of the project are there: the project did open.
    expect(texts(root)).toContain(task.title);
  });
});
