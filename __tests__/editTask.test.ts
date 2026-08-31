import { captureTask } from '../src/features/tasks/application/useCases/captureTask';
import { editTask } from '../src/features/tasks/application/useCases/editTask';
import { EMPTY_WORKSPACE } from '../src/features/tasks/domain/Workspace';

const now = new Date(2026, 7, 30, 10, 0).getTime();
let counter = 0;
const createId = () => `id-${(counter += 1)}`;

function withTask(line: string) {
  counter = 0;
  return captureTask(EMPTY_WORKSPACE, line, { nowMs: now, createId }).workspace;
}

describe('edit a task', () => {
  it('stores the title exactly as written, without parsing it', () => {
    // Renaming a task to "ligar urgente" means those words. Capture reads
    // "urgente" as a priority; editing must not.
    const workspace = withTask('ligar pro banco');
    const result = editTask(
      workspace,
      workspace.tasks[0].id,
      { title: 'ligar urgente' },
      now,
    );

    expect(result.workspace.tasks[0].title).toBe('ligar urgente');
    expect(result.workspace.tasks[0].priority).toBe('medium');
  });

  it('changes only the fields it was given', () => {
    const workspace = withTask('pagar boleto amanhã !alta #financeiro');
    const before = workspace.tasks[0];
    const result = editTask(workspace, before.id, { priority: 'low' }, now);

    expect(result.workspace.tasks[0]).toMatchObject({
      title: before.title,
      dueAtMs: before.dueAtMs,
      listId: before.listId,
      priority: 'low',
    });
  });

  it('can clear a date and move a task to the inbox', () => {
    const workspace = withTask('pagar boleto amanhã #financeiro');
    const result = editTask(
      workspace,
      workspace.tasks[0].id,
      { dueAtMs: null, listId: null },
      now,
    );

    expect(result.workspace.tasks[0].dueAtMs).toBeNull();
    expect(result.workspace.tasks[0].listId).toBe('inbox');
  });

  it('keeps the old title when the new one is blank', () => {
    const workspace = withTask('comprar pão');
    const result = editTask(
      workspace,
      workspace.tasks[0].id,
      { title: '   ' },
      now,
    );

    expect(result.workspace).toBe(workspace);
    expect(result.events).toEqual([]);
  });

  it('says nothing when nothing actually changed', () => {
    const workspace = withTask('comprar pão');
    const result = editTask(
      workspace,
      workspace.tasks[0].id,
      { title: 'comprar pão', priority: 'medium' },
      now,
    );

    expect(result.workspace).toBe(workspace);
    expect(result.events).toEqual([]);
  });

  it('announces the change with what it was before', () => {
    const workspace = withTask('comprar pão');
    const result = editTask(
      workspace,
      workspace.tasks[0].id,
      { title: 'comprar pão integral' },
      now,
    );

    expect(result.events.map(event => event.type)).toEqual([
      'task.edited',
      'workspace.committed',
    ]);
    expect(result.events[0]).toMatchObject({
      before: { title: 'comprar pão' },
      task: { title: 'comprar pão integral' },
    });
  });

  it('does nothing for a task that is not there', () => {
    const workspace = withTask('comprar pão');

    expect(editTask(workspace, 'missing', { title: 'x' }, now).events).toEqual(
      [],
    );
  });
});
