import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { readRenderCounts, resetRenderCounts } from '../src/app/perf/sheetPerf';
import { lightTheme } from '../src/app/theme/theme';
import {
  dayKeyOf,
  type SharedMemberDay,
} from '../src/features/tasks/domain/SharedMemberDay';
import type { Task } from '../src/features/tasks/domain/Task';
import type { TaskList } from '../src/features/tasks/domain/TaskList';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';
import { ListsScreen } from '../src/features/tasks/presentation/screens/ListsScreen';
import { TodayScreen } from '../src/features/tasks/presentation/screens/TodayScreen';
import type { TasksViewModel } from '../src/features/tasks/presentation/view-models/useTasksViewModel';

/**
 * How much work one sheet costs to open.
 *
 * The screen behind the sheet is what makes the press feel slow: every project
 * card and every task card re-rendering in the same frame as the animation
 * starts. These budgets are the measurement, kept as a test so a regression
 * shows up as a failure and not as a feeling.
 */

const copy = getTaskCopy('pt-BR');
const NOW = new Date(2026, 8, 1, 10, 0, 0).getTime();
const ME = 'p-1';

const PROJECT_COUNT = 8;
const TASKS_PER_PROJECT = 6;

function listAt(index: number): TaskList {
  return {
    id: `l-${index}`,
    name: `Projeto ${index}`,
    color: 'sun',
    icon: 'layers',
    share:
      index % 2 === 0
        ? {
            token: `tok-${index}`,
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
                personId: `p-${index}-2`,
                name: 'Rafa',
                handle: null,
                role: 'editor',
                joined: true,
              },
            ],
          }
        : undefined,
  };
}

const lists = Array.from({ length: PROJECT_COUNT }, (_unused, index) =>
  listAt(index),
);

const tasks: Task[] = lists.flatMap(list =>
  Array.from({ length: TASKS_PER_PROJECT }, (_unused, index) => ({
    id: `${list.id}-t-${index}`,
    title: `Tarefa ${index} de ${list.name}`,
    listId: list.id,
    priority: 'medium' as const,
    dueAtMs: NOW + index * 60_000,
    estimatedMinutes: null,
    createdAtMs: NOW - 1000,
    completedAtMs: null,
    completedBy: null,
    subtasks: [],
  })),
);

const days: readonly SharedMemberDay[] = [
  {
    personId: ME,
    dayKey: dayKeyOf(NOW),
    taskIds: [],
    focusTaskId: null,
    updatedAtMs: NOW,
  },
];

function viewModel(): TasksViewModel {
  return {
    nowMs: NOW,
    lists,
    tasks,
    openTaskCount: tasks.length,
    identity: { personId: ME, name: 'Joana', handle: null },
    sharedDays: Object.fromEntries(
      lists.map(list => [list.id, days.map(day => ({ ...day }))]),
    ),
    sharedDayStatus: {},
    groupStreaks: {},
    shareStatus: 'idle',
    shareErrorKind: null,
    joinStatus: 'idle',
    joinErrorKind: null,
    refreshAllSharedLists: () => Promise.resolve([]),
    refreshSharedList: () => Promise.resolve(),
    createShareLink: () => undefined,
    changeInvitedAs: () => undefined,
    copyShareLink: () => undefined,
    inviteToShareLink: () => undefined,
    removeShareMember: () => undefined,
    stopSharingList: () => undefined,
    leaveList: () => undefined,
    deleteList: () => undefined,
    renameList: () => true,
    createList: () => null,
    dismissJoinError: () => undefined,
    joinSharedList: () => Promise.resolve(true),
    pasteFromClipboard: () => Promise.resolve(''),
    capture: () => undefined,
    edit: () => undefined,
    remove: () => undefined,
    moveIntoDay: () => undefined,
    toggle: () => undefined,
    listOf: (listId: string | null) =>
      lists.find(list => list.id === listId) ?? null,
  } as unknown as TasksViewModel;
}

function render(): ReactTestInstance {
  let renderer!: ReturnType<typeof create>;

  act(() => {
    renderer = create(
      <ThemeProvider theme={lightTheme}>
        <ListsScreen
          copy={copy}
          language="pt-BR"
          ownProfile={null}
          viewModel={viewModel()}
        />
      </ThemeProvider>,
    );
  });

  return renderer.root;
}

/**
 * Writes one measurement out. `PERF_OUT` is set by hand when the numbers are
 * being collected for the record; the suite itself only cares about the
 * budgets asserted below.
 */
function report(name: string, cost: Record<string, number>) {
  const env = (globalThis as { process?: { env: Record<string, string> } })
    .process;
  const out = env?.env.PERF_OUT;
  if (out == null) return;

  const { appendFileSync } = require('fs');
  appendFileSync(out, `${JSON.stringify({ name, ...cost })}\n`);
}

function press(root: ReactTestInstance, testID: string) {
  const target = root.findAll(
    node => node.props.testID === testID && node.props.onPress != null,
  )[0];

  act(() => {
    target.props.onPress();
  });
}

/**
 * Renders and milliseconds caused by one press, measured from a clean
 * counter and with a project already open — the state the person is in when
 * they reach for a sheet.
 */
function openCost(name: string, steps: (root: ReactTestInstance) => void) {
  const root = render();

  press(root, 'list-l-0');
  resetRenderCounts();

  const startedAt = Date.now();
  steps(root);
  const elapsed = Date.now() - startedAt;

  const counts = readRenderCounts();
  const cost = {
    sheet: counts[name] ?? 0,
    screen: counts.ListsScreen ?? 0,
    projects: counts.ProjectBlock ?? 0,
    cards: counts.TaskCard ?? 0,
    rows: counts.TaskRow ?? 0,
    ms: elapsed,
  };

  report(name, cost);

  return cost;
}

/** The tasks screen, where the capture sheet is reached from the floating
 * action with every row of the day on screen behind it. */
function todayOpenCost(name: string, testID: string) {
  let renderer!: ReturnType<typeof create>;

  act(() => {
    renderer = create(
      <ThemeProvider theme={lightTheme}>
        <TodayScreen copy={copy} language="pt-BR" viewModel={viewModel()} />
      </ThemeProvider>,
    );
  });

  const root = renderer.root;
  const mounted = readRenderCounts();
  resetRenderCounts();

  const startedAt = Date.now();
  press(root, testID);
  const elapsed = Date.now() - startedAt;

  const counts = readRenderCounts();
  const cost = {
    sheet: counts.QuickCaptureSheet ?? 0,
    screen: counts.TodayScreen ?? 0,
    rows: counts.TaskRow ?? 0,
    rowsOnMount: mounted.TaskRow ?? 0,
    ms: elapsed,
  };

  report(name, cost);

  return cost;
}

describe('what it costs to open a sheet', () => {
  it('opens the share sheet without re-rendering the open project', () => {
    const cost = openCost('ShareSheet', root => {
      press(root, 'list-actions-l-0');
      press(root, 'list-share');
    });

    expect(cost.cards).toBe(0);
  });

  it('opens the capture sheet on the tasks screen without redoing the rows', () => {
    const cost = todayOpenCost('TodayCapture', 'today-capture');

    expect(cost.rows).toBe(0);
  });

  it('opens the project menu, the control for what a press costs on its own', () => {
    const cost = openCost('ProjectMenu', root => {
      press(root, 'list-actions-l-0');
    });

    expect(cost.cards).toBe(0);
  });

  it('opens the invite sheet without re-rendering the open project', () => {
    const cost = openCost('JoinInviteSheet', root => {
      press(root, 'join-invite');
    });

    expect(cost.cards).toBe(0);
  });

  it('opens the capture sheet without re-rendering the open project', () => {
    const cost = openCost('QuickCaptureSheet', root => {
      press(root, 'add-task-l-0');
    });

    expect(cost.cards).toBe(0);
  });
});
