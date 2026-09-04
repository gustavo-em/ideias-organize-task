import type { SharedMemberDay } from '../../domain/SharedMemberDay';
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
  /** Rewrites how the caller is named inside a project they already belong
   * to: the name and handle other members read. Roles and who is in the
   * project are never touched. */
  updateMemberIdentity(share: ListShare, member: ListMember): Promise<void>;
  /** Remote state of the project, for the refresh on opening the tab or
   * pulling down. `null` when the project was taken down by its owner. */
  pull(
    share: ListShare,
  ): Promise<{ list: TaskList; tasks: readonly Task[] } | null>;
  /** Uploads this device's state of a project it already belongs to. */
  push(share: ListShare, list: TaskList, tasks: readonly Task[]): Promise<void>;
  /** Rewrites which tasks of the project one person took. Owner may write any
   * member's entry; everybody else only their own — the rule refuses the
   * rest. Last write wins, per person. */
  setAssignment(
    share: ListShare,
    personId: string,
    taskIds: readonly string[],
  ): Promise<void>;
  /** Publishes what this device took for one day. Last write wins, per
   * member: two people writing the same day never touch each other's entry. */
  publishDay(share: ListShare, day: SharedMemberDay): Promise<void>;
  /** What every member published for one day. A member who published nothing
   * is simply missing from the result — never an empty day. */
  pullDays(
    share: ListShare,
    dayKey: string,
  ): Promise<readonly SharedMemberDay[]>;
  /** What pasting an invite resolves to. Rejects with `ShareOperationError`
   * (`'invalid-invite'`) for a token nobody recognizes. */
  joinByToken(
    token: string,
    member: ListMember,
  ): Promise<{ list: TaskList; tasks: readonly Task[] }>;
}
