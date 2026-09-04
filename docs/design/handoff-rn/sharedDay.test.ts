// Destino: __tests__/sharedDay.test.ts

import { startOfDay } from '../src/features/tasks/domain/Day';
import type { SharedMemberDay } from '../src/features/tasks/domain/SharedDay';
import type { Task } from '../src/features/tasks/domain/Task';
import type { ListMember } from '../src/features/tasks/domain/TaskList';
import {
  everyoneClosed,
  sharedDay,
} from '../src/features/tasks/presentation/models/sharedDay';

const NOW = new Date('2026-09-01T14:00:00Z').getTime();
const TODAY = startOfDay(NOW);

function member(overrides: Partial<ListMember> = {}): ListMember {
  return {
    personId: 'p1',
    name: 'Joana',
    role: 'editor',
    joined: true,
    ...overrides,
  };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Fechar o texto do anúncio',
    listId: 'lancamento',
    priority: 'medium',
    dueAtMs: null,
    estimatedMinutes: null,
    createdAtMs: NOW - 86_400_000,
    completedAtMs: null,
    ...overrides,
  };
}

function day(overrides: Partial<SharedMemberDay> = {}): SharedMemberDay {
  return {
    personId: 'p1',
    dayMs: TODAY,
    taskIds: ['t1'],
    focusTaskId: null,
    ...overrides,
  };
}

describe('o combinado do dia', () => {
  it('põe quem está em foco antes de quem só levou, e quem fechou depois dos dois', () => {
    const joana = member({ personId: 'p1', name: 'Joana' });
    const you = member({ personId: 'p2', name: 'Você', role: 'owner' });
    const rafa = member({ personId: 'p3', name: 'Rafa' });

    const entries = sharedDay(
      [rafa, you, joana],
      [
        day({ personId: 'p1', taskIds: ['t1'], focusTaskId: 't1' }),
        day({ personId: 'p2', taskIds: ['t2'] }),
        day({ personId: 'p3', taskIds: ['t3'] }),
      ],
      [
        task({ id: 't1' }),
        task({ id: 't2' }),
        task({ id: 't3', completedAtMs: NOW - 600_000 }),
      ],
      NOW,
    );

    expect(entries.map(entry => [entry.member.name, entry.state])).toEqual([
      ['Joana', 'focusing'],
      ['Você', 'open'],
      ['Rafa', 'done'],
    ]);
  });

  it('mantém a ordem dos membros dentro de um mesmo estado', () => {
    const entries = sharedDay(
      [
        member({ personId: 'p1', name: 'Joana' }),
        member({ personId: 'p2', name: 'Bia' }),
      ],
      [
        day({ personId: 'p1', taskIds: ['t1'] }),
        day({ personId: 'p2', taskIds: ['t2'] }),
      ],
      [task({ id: 't1' }), task({ id: 't2' })],
      NOW,
    );

    expect(entries.map(entry => entry.member.name)).toEqual(['Joana', 'Bia']);
  });

  it('chama de ausente quem publicou o dia sem nada deste projeto', () => {
    const entries = sharedDay(
      [member()],
      [day({ taskIds: [] })],
      [task()],
      NOW,
    );

    expect(entries).toEqual([
      { member: member(), task: null, state: 'absent' },
    ]);
  });

  it('não inventa ausência para quem não publicou dia nenhum', () => {
    expect(sharedDay([member()], [], [task()], NOW)).toEqual([]);
  });

  it('ignora o dia de ontem', () => {
    const entries = sharedDay(
      [member()],
      [day({ dayMs: TODAY - 86_400_000 })],
      [task()],
      NOW,
    );

    expect(entries).toEqual([]);
  });

  it('deixa de fora quem só tem convite pendente', () => {
    const entries = sharedDay(
      [member({ joined: false })],
      [day()],
      [task()],
      NOW,
    );

    expect(entries).toEqual([]);
  });

  it('prefere a aberta quando a pessoa levou duas e fechou uma', () => {
    const entries = sharedDay(
      [member()],
      [day({ taskIds: ['t1', 't2'] })],
      [task({ id: 't1', completedAtMs: NOW - 60_000 }), task({ id: 't2' })],
      NOW,
    );

    expect(entries[0].state).toBe('open');
    expect(entries[0].task?.id).toBe('t2');
  });

  it('mostra a última que fechou quando tudo que levou está fechado', () => {
    const entries = sharedDay(
      [member()],
      [day({ taskIds: ['t1', 't2'] })],
      [
        task({ id: 't1', completedAtMs: NOW - 600_000 }),
        task({ id: 't2', completedAtMs: NOW - 60_000 }),
      ],
      NOW,
    );

    expect(entries[0].state).toBe('done');
    expect(entries[0].task?.id).toBe('t2');
  });

  it('não acende foco em tarefa já fechada', () => {
    const entries = sharedDay(
      [member()],
      [day({ taskIds: ['t1'], focusTaskId: 't1' })],
      [task({ id: 't1', completedAtMs: NOW - 60_000 })],
      NOW,
    );

    expect(entries[0].state).toBe('done');
  });

  it('só diz que todos fecharam quando há gente e todos fecharam', () => {
    expect(everyoneClosed([])).toBe(false);
    expect(
      everyoneClosed([{ member: member(), task: task(), state: 'done' }]),
    ).toBe(true);
    expect(
      everyoneClosed([
        { member: member(), task: task(), state: 'done' },
        { member: member({ personId: 'p2' }), task: null, state: 'absent' },
      ]),
    ).toBe(false);
  });
});
