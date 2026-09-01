import type { Task } from '../../domain/Task';
import type {
  ListMember,
  ListRole,
  ListShare,
  TaskList,
} from '../../domain/TaskList';

/**
 * The remote side of a shared project.
 *
 * Every method here talks to the network; every use case that changes a
 * `Workspace` stays pure and never imports this file. The result of a call
 * enters the workspace through a view-model action, the same split the rest
 * of the app already keeps between rules and effects.
 */
export interface ShareGateway {
  /** Publishes a project for the first time. `owner` is the caller's own
   * member entry, already `joined: true`. */
  createLink(
    list: TaskList,
    tasks: readonly Task[],
    invitedAs: Exclude<ListRole, 'owner'>,
    owner: ListMember,
  ): Promise<ListShare>;
  /** Takes the project off the network; local tasks are untouched. */
  revokeLink(share: ListShare): Promise<void>;
  removeMember(share: ListShare, personId: string): Promise<void>;
  /** Remote state of the project, for the refresh on opening the tab or
   * pulling down. `null` when the project was taken down by its owner. */
  pull(
    share: ListShare,
  ): Promise<{ list: TaskList; tasks: readonly Task[] } | null>;
  /** Uploads this device's state of a project it already belongs to. */
  push(share: ListShare, list: TaskList, tasks: readonly Task[]): Promise<void>;
  /** What pasting an invite resolves to. Rejects with `ShareOperationError`
   * (`'invalid-invite'`) for a token nobody recognizes. */
  joinByToken(
    token: string,
    member: ListMember,
  ): Promise<{ list: TaskList; tasks: readonly Task[] }>;
}
