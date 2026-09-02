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

  it('says the shared day band in both languages, conjugated by count', () => {
    const pt = getTaskCopy('pt-BR');
    const en = getTaskCopy('en-US');

    for (const copy of [pt, en]) {
      expect(copy.lists.dayBandTitle.length).toBeGreaterThan(0);
      expect(copy.lists.dayBandEmpty.length).toBeGreaterThan(0);
      expect(copy.lists.dayBandTakeOne.length).toBeGreaterThan(0);
      expect(copy.lists.dayBandEmptyHint.length).toBeGreaterThan(0);
      expect(copy.lists.dayBandOffline.length).toBeGreaterThan(0);
      expect(copy.lists.dayBandError.length).toBeGreaterThan(0);
      expect(copy.lists.dayBandRetry.length).toBeGreaterThan(0);
      expect(copy.lists.dayBandRetrying.length).toBeGreaterThan(0);
      expect(copy.lists.dayBandRetryFailed.length).toBeGreaterThan(0);
      expect(copy.lists.dayBandAbsent.length).toBeGreaterThan(0);
      expect(copy.lists.dayBandStateFocusing.length).toBeGreaterThan(0);
      expect(copy.lists.dayBandStateOpen.length).toBeGreaterThan(0);
      expect(copy.lists.dayBandStateDone.length).toBeGreaterThan(0);
      expect(copy.lists.creatingLink.length).toBeGreaterThan(0);
      // A refusal never tells the person to check the internet.
      expect(copy.lists.shareRefused).not.toBe(copy.lists.noNetwork);
      expect(copy.lists.dayBandAllDone(1)).not.toBe(
        copy.lists.dayBandAllDone(3),
      );
      expect(copy.lists.dayBandAllDone(3)).toContain('3');
      expect(copy.lists.dayBandStreak(1)).not.toBe(copy.lists.dayBandStreak(4));
      expect(copy.lists.dayBandStreak(4)).toContain('4');
    }

    expect(pt.lists.dayBandTitle).toBe('Hoje, no combinado');
    expect(en.lists.dayBandTitle).toBe('Today, together');
    expect(pt.lists.dayBandTitle).not.toBe(en.lists.dayBandTitle);
  });

  it('carries the same two walk-through steps in both languages', () => {
    const pt = getTaskCopy('pt-BR');
    const en = getTaskCopy('en-US');

    expect(pt.onboarding.steps).toHaveLength(2);
    expect(en.onboarding.steps).toHaveLength(pt.onboarding.steps.length);

    for (const copy of [pt, en]) {
      for (const step of copy.onboarding.steps) {
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.body.length).toBeGreaterThan(0);
        expect(step.example.length).toBeGreaterThan(0);
      }

      expect(copy.onboarding.skip.length).toBeGreaterThan(0);
      expect(copy.onboarding.stepPosition(2, 4)).toContain('2');
      expect(copy.settings.replayOnboarding.length).toBeGreaterThan(0);
      expect(copy.settings.replayOnboardingHint.length).toBeGreaterThan(0);
    }

    expect(pt.onboarding.steps[0].title).not.toBe(en.onboarding.steps[0].title);
  });

  it('names the shared entity Espaços/Spaces everywhere it is written', () => {
    const pt = getTaskCopy('pt-BR');
    const en = getTaskCopy('en-US');

    expect(pt.tabs.lists).toBe('Espaços');
    expect(en.tabs.lists).toBe('Spaces');
    expect(pt.today.grouping.list).toBe('Espaço');
    expect(en.today.grouping.list).toBe('Space');
    expect(pt.lists.newList).toBe('Novo espaço');
    expect(en.lists.newList).toBe('New space');
    expect(pt.lists.sharedProject).toBe('Espaço compartilhado');
    expect(en.lists.sharedProject).toBe('Shared space');
  });

  it('conjugates the Espaços summary by count in both languages', () => {
    const pt = getTaskCopy('pt-BR');
    const en = getTaskCopy('en-US');

    expect(pt.lists.subtitle(1, 1)).toBe('1 espaço · 1 aberta');
    expect(pt.lists.subtitle(0, 0)).toBe('0 espaços · 0 abertas');
    expect(pt.lists.subtitle(2, 3)).toBe('2 espaços · 3 abertas');
    expect(en.lists.subtitle(1, 1)).toBe('1 space · 1 open');
    expect(en.lists.subtitle(0, 0)).toBe('0 spaces · 0 open');
    expect(en.lists.subtitle(2, 3)).toBe('2 spaces · 3 open');
  });

  it('leaves no "projeto"/"project" in the written copy', () => {
    const forbidden = /projeto|project/i;

    for (const language of ['pt-BR', 'en-US'] as const) {
      for (const [path, value] of walkCopy(getTaskCopy(language))) {
        // Keys may keep the internal name; what is written must not.
        if (forbidden.test(value)) {
          throw new Error(`${language} ${path} still says: ${value}`);
        }
      }
    }
  });

  it('welcomes whoever shares the space, without naming a couple', () => {
    const pt = getTaskCopy('pt-BR');
    const en = getTaskCopy('en-US');
    const exclusive = /parceir|c[ôo]njuge|casal|namorad|partner|spouse/i;

    expect(pt.lists.shareHint).toContain('Convide quem divide isso com você');
    expect(en.lists.shareHint).toContain('Invite whoever shares this with you');
    expect(pt.lists.groupEmpty).toBe(
      'Um espaço vazio, pronto para o que vocês combinarem.',
    );
    expect(en.lists.groupEmpty).toBe(
      'An empty space, ready for whatever you set up together.',
    );

    for (const language of ['pt-BR', 'en-US'] as const) {
      for (const [, value] of walkCopy(getTaskCopy(language))) {
        expect(value).not.toMatch(exclusive);
      }
    }
  });
});

/** Every string the copy can produce, including the ones behind functions. */
function walkCopy(node: unknown, path = ''): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  if (typeof node === 'function') {
    const samples: unknown[][] = [
      ['Casa nova', 'Ana'],
      [1, 2],
      [0, 0],
      [2, 5],
    ];
    const out: [string, string][] = [];
    for (const args of samples) {
      try {
        const value = (node as (...rest: unknown[]) => unknown)(...args);
        if (typeof value === 'string') out.push([path, value]);
      } catch {
        // A signature this sample does not fit: the other samples cover it.
      }
    }
    return out;
  }
  if (Array.isArray(node)) {
    return node.flatMap((item, index) => walkCopy(item, `${path}[${index}]`));
  }
  if (node !== null && typeof node === 'object') {
    return Object.entries(node).flatMap(([key, value]) =>
      walkCopy(value, path ? `${path}.${key}` : key),
    );
  }
  return [];
}
