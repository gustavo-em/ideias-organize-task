import {
  isCaptureUsable,
  parseCapture,
} from '../src/features/tasks/domain/QuickCapture';

// A Tuesday, mid-morning, so "sexta" is later this week and "9h" is behind us.
const now = new Date(2026, 7, 25, 10, 30).getTime();

describe('quick capture', () => {
  it('keeps the sentence and takes everything it understood out of it', () => {
    const draft = parseCapture(
      'ligar pro contador sexta 9h !alta #financeiro',
      now,
    );

    expect(draft.title).toBe('ligar pro contador');
    expect(draft.priority).toBe('high');
    expect(draft.listName).toBe('financeiro');
    expect(new Date(draft.dueAtMs!).getDay()).toBe(5);
    expect(new Date(draft.dueAtMs!).getHours()).toBe(9);
    expect(draft.hasTimeOfDay).toBe(true);
  });

  it('reads a plain line as a medium task with no date', () => {
    const draft = parseCapture('comprar pão', now);

    expect(draft).toMatchObject({
      title: 'comprar pão',
      priority: 'medium',
      dueAtMs: null,
      listName: null,
      estimatedMinutes: null,
    });
  });

  it('puts a date with no time at the end of that day', () => {
    const draft = parseCapture('entregar relatório amanhã', now);
    const due = new Date(draft.dueAtMs!);

    expect(draft.title).toBe('entregar relatório');
    expect(due.getDate()).toBe(26);
    expect(due.getHours()).toBe(23);
    expect(draft.hasTimeOfDay).toBe(false);
  });

  it('moves a time that has already passed to tomorrow', () => {
    const draft = parseCapture('academia 8h', now);

    expect(new Date(draft.dueAtMs!).getDate()).toBe(26);
    expect(new Date(draft.dueAtMs!).getHours()).toBe(8);
  });

  it('keeps a time still ahead on the same day', () => {
    const draft = parseCapture('reunião 14h30', now);
    const due = new Date(draft.dueAtMs!);

    expect(due.getDate()).toBe(25);
    expect(due.getHours()).toBe(14);
    expect(due.getMinutes()).toBe(30);
    expect(draft.title).toBe('reunião');
  });

  it('reads a duration without mistaking it for a clock time', () => {
    const draft = parseCapture('revisar roteiro ~1h30', now);

    expect(draft.estimatedMinutes).toBe(90);
    expect(draft.dueAtMs).toBeNull();
    expect(draft.title).toBe('revisar roteiro');
  });

  it('reads minutes and hours written the short way', () => {
    expect(parseCapture('tarefa ~45min', now).estimatedMinutes).toBe(45);
    expect(parseCapture('tarefa ~2h', now).estimatedMinutes).toBe(120);
    expect(parseCapture('tarefa ~90', now).estimatedMinutes).toBe(90);
  });

  it('reads an explicit date and rolls a past one into next year', () => {
    expect(new Date(parseCapture('pagar 30/9', now).dueAtMs!).getMonth()).toBe(
      8,
    );
    expect(
      new Date(parseCapture('pagar 2/1', now).dueAtMs!).getFullYear(),
    ).toBe(2027);
  });

  it('reads priority from the words people actually use', () => {
    // Nobody arrives typing punctuation. The shorthand still works, but it is
    // a shortcut for people who learned it, never the only way in.
    expect(parseCapture('ligar pro banco urgente', now)).toMatchObject({
      title: 'ligar pro banco',
      priority: 'high',
    });
    expect(parseCapture('trocar a lâmpada sem pressa', now)).toMatchObject({
      title: 'trocar a lâmpada',
      priority: 'low',
    });
    expect(parseCapture('responder email quando der', now).priority).toBe(
      'low',
    );
    expect(parseCapture('reunião importante', now).priority).toBe('high');
  });

  it('does not find a priority inside a longer word', () => {
    expect(parseCapture('comprar detergente', now).priority).toBe('medium');
    expect(parseCapture('comprar detergente', now).title).toBe(
      'comprar detergente',
    );
  });

  it('leaves a priority word it does not know inside the title', () => {
    const draft = parseCapture('mandar email !talvez', now);

    expect(draft.priority).toBe('medium');
    expect(draft.title).toBe('mandar email !talvez');
  });

  it('drops the connector left dangling by what it removed', () => {
    expect(parseCapture('reunião com o time às 15h', now).title).toBe(
      'reunião com o time',
    );
  });

  it('never returns an empty title', () => {
    expect(parseCapture('!alta #casa', now).title.length).toBeGreaterThan(0);
    expect(isCaptureUsable('   ')).toBe(false);
    expect(isCaptureUsable('x')).toBe(true);
  });
});
