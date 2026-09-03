import { clampRemindDays } from '../../domain/DeadlineReminder';
import { isCaptureUsable, parseCapture } from '../../domain/QuickCapture';
import { addSubtask, type Subtask } from '../../domain/Subtask';
import type { Task, TaskPriority } from '../../domain/Task';
import type { TaskEvent, UseCaseResult } from '../../domain/TaskEvent';
import {
  createList,
  findListByName,
  INBOX_LIST_ID,
  nextListColor,
} from '../../domain/TaskList';
import { refreshTrio } from '../../domain/Trio';
import type { Workspace } from '../../domain/Workspace';

interface CaptureDependencies {
  nowMs: number;
  createId: (atMs: number) => string;
  /** How long the person spent in the capture sheet, measured at the edge. */
  tookMs?: number | null;
}

/**
 * What the person set by hand, which beats whatever the text was read as.
 *
 * A tap is a decision; parsing is a guess. When the two disagree the decision
 * wins, and only the fields actually touched are present here.
 */
export interface CaptureOverrides {
  priority?: TaskPriority;
  dueAtMs?: number | null;
  listId?: string | null;
  /** How many days before the deadline to say something. Only meaningful with
   * a date: without one there is nothing to count back from. */
  remindDaysBefore?: number | null;
  /** A list can only be born from an explicit UI action, never from a guessed
   * `#name` in the task text. */
  newListName?: string;
  /** Steps written in the sheet before the task existed. They are titles, not
   * subtasks: the identifiers are minted here, with the task itself, so a
   * draft that was cancelled never leaves anything behind. */
  subtaskTitles?: readonly string[];
}

/**
 * Turns one typed line into a task.
 *
 * A line that says nothing is not an error: the sheet simply keeps waiting.
 * A `#name` still recognises an existing list, but cannot silently create a
 * new one. Lists represent larger outcomes, so their creation is deliberate.
 */
export function captureTask(
  workspace: Workspace,
  typed: string,
  dependencies: CaptureDependencies,
  overrides: CaptureOverrides = {},
): UseCaseResult {
  if (!isCaptureUsable(typed)) return { workspace, events: [] };

  const { nowMs, createId, tookMs = null } = dependencies;
  const draft = parseCapture(typed, nowMs);
  const chosenListId = overrides.listId;
  const existingList = findListByName(workspace.lists, draft.listName);
  const explicitList = findListByName(
    workspace.lists,
    overrides.newListName ?? null,
  );
  const newList =
    chosenListId === undefined &&
    overrides.newListName != null &&
    overrides.newListName.trim().length > 0 &&
    explicitList == null
      ? createList(overrides.newListName, nextListColor(workspace.lists))
      : null;
  const lists =
    newList == null ? workspace.lists : [...workspace.lists, newList];

  // The steps written in the same breath as the title. `addSubtask` is what
  // trims, drops the empty ones and stops at the limit, so a draft cannot get
  // in through a door the task screen keeps shut.
  const subtasks = (overrides.subtaskTitles ?? []).reduce<readonly Subtask[]>(
    (current, title) => addSubtask(current, title, nowMs, createId(nowMs)),
    [],
  );

  const dueAtMs =
    overrides.dueAtMs === undefined ? draft.dueAtMs : overrides.dueAtMs;
  const task: Task = {
    id: createId(nowMs),
    title: draft.title,
    listId:
      chosenListId === undefined
        ? explicitList?.id ?? newList?.id ?? existingList?.id ?? INBOX_LIST_ID
        : chosenListId ?? INBOX_LIST_ID,
    priority: overrides.priority ?? draft.priority,
    dueAtMs,
    // Asked for in the sheet, and only kept when the date it counts back from
    // leaves room for it.
    remindDaysBefore: clampRemindDays(
      dueAtMs,
      overrides.remindDaysBefore ?? null,
      nowMs,
    ),
    estimatedMinutes: draft.estimatedMinutes,
    createdAtMs: nowMs,
    completedAtMs: null,
    // Written with the task or added later, from the task itself. Either way
    // the task lands complete: one capture, one event.
    subtasks,
  };

  const tasks = [task, ...workspace.tasks];
  // A day with an empty slot takes the new task straight away, so capturing
  // something urgent on a quiet morning does not need a second decision.
  const trio = refreshTrio(workspace.trio, tasks, nowMs);
  const next: Workspace = { ...workspace, tasks, lists, trio };
  const events: TaskEvent[] = [
    { type: 'task.captured', at: nowMs, task, typed, tookMs },
  ];

  if (trio !== workspace.trio) {
    events.push({ type: 'trio.assembled', at: nowMs, taskIds: trio.taskIds });
  }

  events.push({ type: 'workspace.committed', at: nowMs, workspace: next });

  return { workspace: next, events };
}
