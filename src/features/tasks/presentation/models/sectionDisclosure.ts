import type { HomeGrouping } from './homeSections';

export const SECTION_DISCLOSURE_THRESHOLD = 4;

/**
 * `conditional` is the approved product policy. `all-secondary` is the
 * pre-approved accessibility fallback if device inspection finds that the
 * conditional affordance is ambiguous. Keeping both branches here prevents a
 * visual fallback from quietly changing which urgent sections may collapse.
 */
export type SectionDisclosureMode = 'conditional' | 'all-secondary';

export const SECTION_DISCLOSURE_MODE: SectionDisclosureMode = 'conditional';

export interface SectionDisclosurePolicy {
  collapsible: boolean;
  initiallyExpanded: boolean;
}

interface SectionSummary {
  id: string;
  tasks: readonly unknown[];
}

/**
 * The single disclosure policy for every grouping on the open-tasks screen.
 * Urgent sections never collapse. In conditional mode, secondary sections
 * become controls only when they contain at least four tasks.
 */
export function sectionDisclosurePolicy(
  grouping: HomeGrouping,
  sectionId: string,
  taskCount: number,
  mode: SectionDisclosureMode = SECTION_DISCLOSURE_MODE,
): SectionDisclosurePolicy {
  const isUrgent =
    (grouping === 'deadline' &&
      (sectionId === 'overdue' || sectionId === 'today')) ||
    (grouping === 'priority' && sectionId === 'priority-high');

  if (isUrgent) {
    return { collapsible: false, initiallyExpanded: true };
  }

  const collapsible =
    mode === 'all-secondary' || taskCount >= SECTION_DISCLOSURE_THRESHOLD;

  // Every section of the day opens showing its work. Closing one is a choice
  // the person makes on the header; it is never the state they are handed.
  return {
    collapsible,
    initiallyExpanded: true,
  };
}

/** Returns the predictable defaults used on mount and grouping changes. */
export function initialCollapsedSectionIds(
  grouping: HomeGrouping,
  sections: readonly SectionSummary[],
  mode: SectionDisclosureMode = SECTION_DISCLOSURE_MODE,
): ReadonlySet<string> {
  return new Set(
    sections.flatMap(section => {
      const policy = sectionDisclosurePolicy(
        grouping,
        section.id,
        section.tasks.length,
        mode,
      );

      return policy.collapsible && !policy.initiallyExpanded
        ? [section.id]
        : [];
    }),
  );
}

/**
 * Removes stale collapsed choices when a section drops below the threshold.
 * If it grows again later, it stays open instead of unexpectedly hiding work.
 */
export function reconcileCollapsedSectionIds(
  collapsedIds: ReadonlySet<string>,
  grouping: HomeGrouping,
  sections: readonly SectionSummary[],
  mode: SectionDisclosureMode = SECTION_DISCLOSURE_MODE,
): ReadonlySet<string> {
  const collapsibleIds = new Set(
    sections
      .filter(
        section =>
          sectionDisclosurePolicy(
            grouping,
            section.id,
            section.tasks.length,
            mode,
          ).collapsible,
      )
      .map(section => section.id),
  );
  const next = new Set(
    [...collapsedIds].filter(sectionId => collapsibleIds.has(sectionId)),
  );

  if (
    next.size === collapsedIds.size &&
    [...next].every(sectionId => collapsedIds.has(sectionId))
  ) {
    return collapsedIds;
  }

  return next;
}
