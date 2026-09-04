import { DAY_MS, endOfDay } from '../src/features/tasks/domain/Day';
import type { Task } from '../src/features/tasks/domain/Task';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';
import { deadlineSections } from '../src/features/tasks/presentation/models/deadlineSections';

const now = new Date(2026, 7, 28, 10, 0).getTime();
const copy = getTaskCopy('pt-BR');

function task(
  id: string,
  dueAtMs: number | null,
  priority: Task['priority'] = 'medium',
): Task {
  return {
    id,
    title: id,
    listId: 'inbox',
    priority,
    dueAtMs,
    estimatedMinutes: null,
    createdAtMs: now,
    completedAtMs: null,
    subtasks: [],
  };
}

describe('deadline sections', () => {
  it('puts open work in calm, chronological deadline groups', () => {
    const sections = deadlineSections(
      [
        task('without-date', null),
        task('tomorrow', endOfDay(now + DAY_MS)),
        task('today-low', endOfDay(now), 'low'),
        task('overdue', endOfDay(now - DAY_MS)),
        task('today-high', endOfDay(now), 'high'),
        task('future', endOfDay(now + 4 * DAY_MS)),
      ],
      now,
      'pt-BR',
      copy,
    );

    expect(sections.map(section => section.title)).toEqual([
      'Antes de hoje',
      'Hoje',
      'Amanhã',
      'Terça, 1 de setembro',
      'Sem prazo',
    ]);
    expect(sections[1].tasks.map(entry => entry.id)).toEqual([
      'today-high',
      'today-low',
    ]);
  });

  it('does not keep completed work in an attention-oriented view', () => {
    const completed = { ...task('done', endOfDay(now)), completedAtMs: now };

    expect(deadlineSections([completed], now, 'pt-BR', copy)).toHaveLength(0);
  });
});
