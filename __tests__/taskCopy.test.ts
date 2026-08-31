import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';

describe('open task screen copy', () => {
  it('names the destination and scope accurately in pt-BR', () => {
    const copy = getTaskCopy('pt-BR');

    expect(copy.tabs.today).toBe('Tarefas');
    expect(copy.today.title).toBe('Em aberto');
    expect(copy.today.taskCount(0)).toBe('0 tarefas');
    expect(copy.today.taskCount(1)).toBe('1 tarefa');
    expect(copy.today.taskCount(2)).toBe('2 tarefas');
    expect(copy.today.expand).toBe('Expandir seção');
    expect(copy.today.collapse).toBe('Recolher seção');
  });

  it('names the destination and scope accurately in en-US', () => {
    const copy = getTaskCopy('en-US');

    expect(copy.tabs.today).toBe('Tasks');
    expect(copy.today.title).toBe('Open tasks');
    expect(copy.today.taskCount(0)).toBe('0 tasks');
    expect(copy.today.taskCount(1)).toBe('1 task');
    expect(copy.today.taskCount(2)).toBe('2 tasks');
    expect(copy.today.expand).toBe('Expand section');
    expect(copy.today.collapse).toBe('Collapse section');
  });
});
