import type { ListColor, ProjectIcon } from '../../domain/TaskList';
import type { TaskCopy } from '../localization/taskCopy';
import type { HomeGrouping } from './homeSections';
import type { TaskFacts } from './taskMeta';

/**
 * Which single fact a task row shows on its right.
 *
 * The card had room for every fact at once; the row has room for one. Picking
 * it is a rule, not a layout accident, so it lives here as a pure function and
 * is tested like the other models.
 *
 * The rule that matters is not the order — it is that the fact never repeats
 * what the section heading above it already says. Under "Amanhã" every task is
 * due tomorrow, so printing "amanhã" on each row spends the width and tells
 * the reader nothing. `TaskFacts` already made this decision informally in
 * compact mode; here it is explicit and can be checked.
 */
export type RowFactKind = 'late' | 'estimate' | 'due' | 'project' | 'stale';

export interface RowFact {
  kind: RowFactKind;
  text: string;
  /** Named against the theme rather than resolved, so the model stays free of
   * React and of the theme object. */
  tone: 'danger' | 'mutedStrong';
  weight: 500 | 600 | 700;
  /** Only the project fact draws a glyph before its text. */
  project: { color: ListColor | null; icon: ProjectIcon | null } | null;
}

export interface RowFactInput {
  facts: TaskFacts;
  /** The lens the list is grouped by. It decides what is already said by the
   * heading and therefore must not be repeated in the row. */
  lens: HomeGrouping;
  /** The section the row sits in. Only `today` earns the estimate. */
  sectionId: string;
  estimatedMinutes: number | null;
  /** Whole days past the deadline. Ignored unless the task is late. */
  lateDays: number;
  copy: TaskCopy;
  listColor: ListColor | null;
  listIcon: ProjectIcon | null;
}

export function rowFact({
  facts,
  lens,
  sectionId,
  estimatedMinutes,
  lateDays,
  copy,
  listColor,
  listIcon,
}: RowFactInput): RowFact | null {
  // Being late outranks everything, including the heading that groups it: the
  // overdue section says the task is late, this says by how much.
  if (facts.due?.late) {
    return {
      kind: 'late',
      text: copy.today.lateDays(Math.max(1, lateDays)),
      tone: 'danger',
      weight: 700,
      project: null,
    };
  }

  // Time only helps where the decision is "what do I do now", which is today.
  if (
    estimatedMinutes != null &&
    estimatedMinutes > 0 &&
    sectionId === 'today'
  ) {
    return {
      kind: 'estimate',
      text: copy.capture.minutes(estimatedMinutes),
      tone: 'mutedStrong',
      weight: 600,
      project: null,
    };
  }

  if (facts.due != null && lens !== 'deadline') {
    return {
      kind: 'due',
      text: facts.due.label,
      tone: 'mutedStrong',
      weight: 600,
      project: null,
    };
  }

  // Where it lives, always. The inbox is a place too, so the row is given the
  // real list rather than a null: a column that fills on some rows and not
  // others reads as a bug in the layout instead of a fact about the task.
  if (facts.listName != null && lens !== 'list') {
    return {
      kind: 'project',
      text: facts.listName,
      tone: 'mutedStrong',
      weight: 600,
      project: { color: listColor, icon: listIcon },
    };
  }

  if (facts.stale != null) {
    return {
      kind: 'stale',
      text: facts.stale.label,
      tone: 'mutedStrong',
      weight: 500,
      project: null,
    };
  }

  // Nothing left worth saying. Empty is a valid answer: an invented fact costs
  // more than the silence.
  return null;
}
