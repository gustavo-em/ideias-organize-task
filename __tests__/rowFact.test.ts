import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';
import { rowFact } from '../src/features/tasks/presentation/models/rowFact';
import type { RowFactInput } from '../src/features/tasks/presentation/models/rowFact';
import type { TaskFacts } from '../src/features/tasks/presentation/models/taskMeta';

const copy = getTaskCopy('pt-BR');

function facts(overrides: Partial<TaskFacts> = {}): TaskFacts {
  return {
    priority: { label: 'média', level: 2, tone: 'accent' },
    due: null,
    stale: null,
    listName: null,
    ...overrides,
  };
}

function input(overrides: Partial<RowFactInput> = {}): RowFactInput {
  return {
    facts: facts(),
    lens: 'deadline',
    sectionId: 'noDate',
    estimatedMinutes: null,
    lateDays: 0,
    copy,
    listColor: null,
    listIcon: null,
    ...overrides,
  };
}

describe('the one fact a task row shows', () => {
  it('says how late, not just that it is late', () => {
    const fact = rowFact(
      input({
        facts: facts({
          due: { kind: 'overdue', label: 'atrasada', late: true },
        }),
        sectionId: 'overdue',
        lateDays: 3,
      }),
    );

    expect(fact).toEqual({
      kind: 'late',
      text: '3 dias',
      tone: 'danger',
      weight: 700,
      project: null,
    });
  });

  it('never reports zero days late', () => {
    const fact = rowFact(
      input({
        facts: facts({
          due: { kind: 'overdue', label: 'atrasada', late: true },
        }),
        lateDays: 0,
      }),
    );

    expect(fact?.text).toBe('1 dia');
  });

  it('beats an estimate with lateness', () => {
    const fact = rowFact(
      input({
        facts: facts({
          due: { kind: 'overdue', label: 'atrasada', late: true },
        }),
        sectionId: 'today',
        estimatedMinutes: 45,
        lateDays: 2,
      }),
    );

    expect(fact?.kind).toBe('late');
  });

  it('offers the estimate only where the decision is what to do now', () => {
    expect(
      rowFact(input({ sectionId: 'today', estimatedMinutes: 45 })),
    ).toMatchObject({ kind: 'estimate', text: '45 min', weight: 600 });

    expect(
      rowFact(input({ sectionId: 'tomorrow', estimatedMinutes: 45 })),
    ).toBeNull();
  });

  it('drops the date under the deadline lens and keeps it elsewhere', () => {
    const due = facts({
      due: { kind: 'tomorrow', label: 'amanhã', late: false },
    });

    expect(rowFact(input({ facts: due, lens: 'deadline' }))).toBeNull();
    expect(rowFact(input({ facts: due, lens: 'priority' }))).toMatchObject({
      kind: 'due',
      text: 'amanhã',
    });
  });

  it('drops the project name under the project lens and keeps it elsewhere', () => {
    const named = facts({ listName: 'Lançamento' });

    expect(rowFact(input({ facts: named, lens: 'list' }))).toBeNull();
    expect(
      rowFact(input({ facts: named, lens: 'deadline', listIcon: 'briefcase' })),
    ).toMatchObject({
      kind: 'project',
      text: 'Lançamento',
      project: { color: null, icon: 'briefcase' },
    });
  });

  it('falls back to age for something old and undated', () => {
    expect(
      rowFact(
        input({ facts: facts({ stale: { label: 'parada há 9 dias' } }) }),
      ),
    ).toMatchObject({ kind: 'stale', weight: 500 });
  });

  it('prefers the project name over the age', () => {
    const both = facts({
      listName: 'Casa',
      stale: { label: 'parada há 9 dias' },
    });

    expect(rowFact(input({ facts: both }))?.kind).toBe('project');
  });

  it('leaves the right side empty when nothing is worth saying', () => {
    expect(rowFact(input())).toBeNull();
  });
});
