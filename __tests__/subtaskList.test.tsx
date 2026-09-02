import { useState } from 'react';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { lightTheme, darkTheme } from '../src/app/theme/theme';
import { captureTask } from '../src/features/tasks/application/useCases/captureTask';
import {
  addSubtask,
  deleteSubtask,
  renameSubtask,
  toggleSubtask,
} from '../src/features/tasks/application/useCases/manageSubtasks';
import {
  EMPTY_WORKSPACE,
  type Workspace,
} from '../src/features/tasks/domain/Workspace';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';
import { SubtaskList } from '../src/features/tasks/presentation/views/SubtaskList';

/**
 * Ticking a step, and untucking it again.
 *
 * The screen test could not prove the second half on the device, so it is
 * proven here through the same road the sheet takes: the real use cases, the
 * real component, and the counter that the card repeats.
 */

const copy = getTaskCopy('pt-BR');
const NOW = new Date(2026, 8, 1, 10, 0, 0).getTime();

function seed(): Workspace {
  let counter = 0;
  const createId = () => `id-${(counter += 1)}`;
  const captured = captureTask(EMPTY_WORKSPACE, 'fechar contrato', {
    nowMs: NOW,
    createId,
  }).workspace;
  const taskId = captured.tasks[0].id;

  return ['assinar', 'enviar'].reduce(
    (workspace, title) => addSubtask(workspace, taskId, title, NOW).workspace,
    captured,
  );
}

function Host({ theme = lightTheme }: { theme?: typeof lightTheme }) {
  const [workspace, setWorkspace] = useState(seed);
  const task = workspace.tasks[0];

  return (
    <ThemeProvider theme={theme}>
      <SubtaskList
        copy={copy}
        onAdd={title =>
          setWorkspace(
            current => addSubtask(current, task.id, title, NOW).workspace,
          )
        }
        onDelete={subtaskId =>
          setWorkspace(
            current =>
              deleteSubtask(current, task.id, subtaskId, NOW).workspace,
          )
        }
        onRename={(subtaskId, title) =>
          setWorkspace(
            current =>
              renameSubtask(current, task.id, subtaskId, title, NOW).workspace,
          )
        }
        onToggle={subtaskId =>
          setWorkspace(
            current =>
              toggleSubtask(current, task.id, subtaskId, NOW).workspace,
          )
        }
        subtasks={task.subtasks}
      />
    </ThemeProvider>
  );
}

function render(theme?: typeof lightTheme) {
  let tree!: ReturnType<typeof create>;

  act(() => {
    tree = create(<Host theme={theme} />);
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

function texts(tree: ReturnType<typeof create>): string[] {
  return tree.root
    .findAll(node => typeof node.type === 'string' && node.props?.children)
    .flatMap(node =>
      typeof node.props.children === 'string' ? [node.props.children] : [],
    );
}

/** The ids are made when the step is, so they are read off the tree rather
 * than guessed. */
function idsOf(tree: ReturnType<typeof create>, prefix: string): string[] {
  const seen = new Set<string>();

  tree.root
    .findAll(
      node =>
        typeof node.props?.testID === 'string' &&
        node.props.testID.startsWith(prefix),
    )
    .forEach(node => seen.add(node.props.testID));

  return [...seen];
}

/** The same testID rides the component and the pressable it renders; the one
 * that presses is the one that carries `onPress`. */
function press(tree: ReturnType<typeof create>, id: string) {
  const target = byId(tree, id).find(
    node => typeof node.props.onPress === 'function',
  );

  act(() => {
    target?.props.onPress();
  });
}

describe('the steps inside a task, on screen', () => {
  it('ticks both steps and unticks one, counter and note following', () => {
    const tree = render();
    const [first, second] = idsOf(tree, 'subtask-checkbox-');

    expect(texts(tree)).toContain('0/2');

    press(tree, first);
    expect(texts(tree)).toContain('1/2');
    expect(texts(tree)).not.toContain(copy.subtasks.allDone);

    press(tree, second);
    expect(texts(tree)).toContain('2/2');
    expect(texts(tree)).toContain(copy.subtasks.allDone);

    // The half the device run never reached: the same box, pressed again.
    press(tree, first);
    expect(texts(tree)).toContain('1/2');
    expect(texts(tree)).not.toContain(copy.subtasks.allDone);

    press(tree, second);
    expect(texts(tree)).toContain('0/2');
  });

  it('deletes a step, and the counter goes with it', () => {
    const tree = render();
    const [first] = idsOf(tree, 'subtask-delete-');

    press(tree, first);

    expect(texts(tree)).toContain('0/1');
  });

  it('keeps a half-written step on save and drops it on cancel', () => {
    const added: string[] = [];

    function mount(keep: boolean) {
      let tree!: ReturnType<typeof create>;

      act(() => {
        tree = create(
          <ThemeProvider theme={lightTheme}>
            <SubtaskList
              copy={copy}
              onAdd={title => added.push(title)}
              onDelete={() => {}}
              onRename={() => {}}
              onToggle={() => {}}
              shouldKeepPending={() => keep}
              subtasks={[]}
            />
          </ThemeProvider>,
        );
      });

      act(() => {
        byId(tree, 'subtask-add-field')[0].props.onChangeText('revisar');
      });
      act(() => tree.unmount());
    }

    mount(false);
    expect(added).toEqual([]);

    mount(true);
    expect(added).toEqual(['revisar']);
  });

  it('draws the same lines on the dark theme', () => {
    const tree = render(darkTheme);

    expect(idsOf(tree, 'subtask-checkbox-')).toHaveLength(2);
    expect(texts(tree)).toContain('0/2');
  });
});
