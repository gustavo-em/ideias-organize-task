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
      expect(copy.lists.dayBandOffline.length).toBeGreaterThan(0);
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

  it('carries the same four walk-through steps in both languages', () => {
    const pt = getTaskCopy('pt-BR');
    const en = getTaskCopy('en-US');

    expect(pt.onboarding.steps).toHaveLength(4);
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
});
