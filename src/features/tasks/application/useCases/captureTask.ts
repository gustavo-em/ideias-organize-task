import { isCaptureUsable, parseCapture } from '../../domain/QuickCapture';
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
  /** A list can only be born from an explicit UI action, never from a guessed
   * `#name` in the task text. */
  newListName?: string;
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

  const task: Task = {
    id: createId(nowMs),
    title: draft.title,
    listId:
      chosenListId === undefined
        ? explicitList?.id ?? newList?.id ?? existingList?.id ?? INBOX_LIST_ID
        : chosenListId ?? INBOX_LIST_ID,
    priority: overrides.priority ?? draft.priority,
    dueAtMs:
      overrides.dueAtMs === undefined ? draft.dueAtMs : overrides.dueAtMs,
    estimatedMinutes: draft.estimatedMinutes,
    createdAtMs: nowMs,
    completedAtMs: null,
    // Capture stays one field: steps are added later, from the task itself.
    subtasks: [],
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
