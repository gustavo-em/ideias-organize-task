import { createTaskList } from '../src/features/tasks/application/useCases/manageTaskList';
import {
  acceptInvite,
  removeMember,
  shareTaskList,
  stopSharing,
} from '../src/features/tasks/application/useCases/shareTaskList';
import { INBOX_LIST_ID } from '../src/features/tasks/domain/TaskList';
import { EMPTY_WORKSPACE } from '../src/features/tasks/domain/Workspace';

const now = new Date(2026, 7, 25, 10, 0).getTime();

const owner = {
  personId: 'owner-1',
  name: 'Joana',
  handle: null,
  role: 'owner' as const,
  joined: true,
};

describe('sharing a project', () => {
  it('records a link and the owner as the first member', () => {
    const created = createTaskList(EMPTY_WORKSPACE, 'Lançamento', now);
    const listId = created.workspace.lists[1].id;
    const shared = shareTaskList(
      created.workspace,
      listId,
      { token: '7k2xazjm', invitedAs: 'editor', members: [owner] },
      now,
    );

    expect(shared.workspace.lists[1].share?.token).toBe('7k2xazjm');
    expect(shared.events.map(event => event.type)).toEqual([
      'list.shared',
      'workspace.committed',
    ]);
  });

  it('removes the link without touching tasks', () => {
    const created = createTaskList(EMPTY_WORKSPACE, 'Lançamento', now);
    const listId = created.workspace.lists[1].id;
    const shared = shareTaskList(
      created.workspace,
      listId,
      { token: '7k2xazjm', invitedAs: 'editor', members: [owner] },
      now,
    ).workspace;
    const stopped = stopSharing(shared, listId, now);

    expect(stopped.workspace.lists[1].share).toBeUndefined();
    expect(stopped.events.map(event => event.type)).toEqual([
      'list.unshared',
      'workspace.committed',
    ]);
  });

  it('removes one member and keeps the rest', () => {
    const created = createTaskList(EMPTY_WORKSPACE, 'Lançamento', now);
    const listId = created.workspace.lists[1].id;
    const joana = {
      personId: 'p-2',
      name: 'Rafa',
      handle: null,
      role: 'editor' as const,
      joined: true,
    };
    const shared = shareTaskList(
      created.workspace,
      listId,
      { token: '7k2xazjm', invitedAs: 'editor', members: [owner, joana] },
      now,
    ).workspace;
    const removed = removeMember(shared, listId, 'p-2', now);

    expect(removed.workspace.lists[1].share?.members).toHaveLength(1);
  });

  it('accepts an invite with an id prefixed by the token, and rejects the inbox', () => {
    const list = {
      id: 'lancamento',
      name: 'Lançamento',
      color: 'sun' as const,
      icon: 'layers' as const,
      share: {
        token: '7k2xazjm',
        invitedAs: 'editor' as const,
        members: [owner],
      },
    };
    const accepted = acceptInvite(
      EMPTY_WORKSPACE,
      { list, tasks: [] },
      owner,
      now,
    );

    expect(accepted.workspace.lists[1].id).toBe('lancamento@7k2x');
    expect(accepted.events.map(event => event.type)).toEqual([
      'list.member.joined',
      'workspace.committed',
    ]);

    const inboxAttempt = acceptInvite(
      EMPTY_WORKSPACE,
      { list: { ...list, id: INBOX_LIST_ID }, tasks: [] },
      owner,
      now,
    );

    expect(inboxAttempt.events).toEqual([]);
  });
});
