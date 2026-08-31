import {
  initialCollapsedSectionIds,
  reconcileCollapsedSectionIds,
  sectionDisclosurePolicy,
} from '../src/features/tasks/presentation/models/sectionDisclosure';

function section(id: string, taskCount: number) {
  return { id, tasks: Array.from({ length: taskCount }) };
}

describe('section disclosure policy', () => {
  it('never collapses overdue, today, or high priority sections', () => {
    expect(sectionDisclosurePolicy('deadline', 'overdue', 12)).toEqual({
      collapsible: false,
      initiallyExpanded: true,
    });
    expect(sectionDisclosurePolicy('deadline', 'today', 12)).toEqual({
      collapsible: false,
      initiallyExpanded: true,
    });
    expect(sectionDisclosurePolicy('priority', 'priority-high', 12)).toEqual({
      collapsible: false,
      initiallyExpanded: true,
    });
  });

  it('uses the four-task threshold for secondary sections', () => {
    expect(sectionDisclosurePolicy('deadline', 'tomorrow', 3)).toEqual({
      collapsible: false,
      initiallyExpanded: false,
    });
    expect(sectionDisclosurePolicy('deadline', 'tomorrow', 4)).toEqual({
      collapsible: true,
      initiallyExpanded: false,
    });
    expect(sectionDisclosurePolicy('list', 'list-work', 4)).toEqual({
      collapsible: true,
      initiallyExpanded: true,
    });
    expect(sectionDisclosurePolicy('priority', 'priority-medium', 4)).toEqual({
      collapsible: true,
      initiallyExpanded: true,
    });
  });

  it('keeps the approved all-secondary fallback explicit and urgent-safe', () => {
    expect(
      sectionDisclosurePolicy('deadline', 'tomorrow', 1, 'all-secondary'),
    ).toEqual({ collapsible: true, initiallyExpanded: false });
    expect(
      sectionDisclosurePolicy('priority', 'priority-low', 1, 'all-secondary'),
    ).toEqual({ collapsible: true, initiallyExpanded: true });
    expect(
      sectionDisclosurePolicy('deadline', 'today', 8, 'all-secondary'),
    ).toEqual({ collapsible: false, initiallyExpanded: true });
  });

  it('resets to each grouping default instead of carrying hidden sections', () => {
    const deadlineDefaults = initialCollapsedSectionIds('deadline', [
      section('today', 5),
      section('tomorrow', 4),
    ]);
    const projectDefaults = initialCollapsedSectionIds('list', [
      section('list-work', 5),
    ]);

    expect([...deadlineDefaults]).toEqual(['tomorrow']);
    expect([...projectDefaults]).toEqual([]);
  });

  it('opens and forgets a collapsed section after it drops below four tasks', () => {
    const collapsed = new Set(['tomorrow']);
    const reconciled = reconcileCollapsedSectionIds(collapsed, 'deadline', [
      section('tomorrow', 3),
    ]);

    expect([...reconciled]).toEqual([]);
  });
});
