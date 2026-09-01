import {
  canEdit,
  canShare,
  isShared,
  memberInitials,
  parseInviteToken,
  sanitizeLists,
  withMember,
  withoutMember,
  type TaskList,
} from '../src/features/tasks/domain/TaskList';

const owner = {
  personId: 'p-1',
  name: 'Joana Melo',
  handle: null,
  role: 'owner' as const,
  joined: true,
};
const editor = {
  personId: 'p-2',
  name: 'Rafa',
  handle: null,
  role: 'editor' as const,
  joined: true,
};

const shared: TaskList = {
  id: 'lancamento',
  name: 'Lançamento',
  color: 'sun',
  icon: 'layers',
  share: { token: '7k2xazjm', invitedAs: 'editor', members: [owner] },
};

describe('shared project rules', () => {
  it('is not shared until a second member joins', () => {
    expect(isShared(shared)).toBe(false);
    expect(isShared(withMember(shared, editor))).toBe(true);
  });

  it('never shares the Caixa', () => {
    expect(
      canShare({ id: 'inbox', name: 'Caixa', color: 'sun', icon: 'inbox' }),
    ).toBe(false);
    expect(canShare(shared)).toBe(true);
  });

  it('lets owner and editor change things, and viewer only read', () => {
    const withEditor = withMember(shared, editor);
    const viewer = {
      personId: 'p-3',
      name: 'Léo',
      handle: null,
      role: 'viewer' as const,
      joined: true,
    };
    const withViewer = withMember(withEditor, viewer);

    expect(canEdit(withViewer, 'p-1')).toBe(true);
    expect(canEdit(withViewer, 'p-2')).toBe(true);
    expect(canEdit(withViewer, 'p-3')).toBe(false);
    expect(
      canEdit({ id: 'x', name: 'x', color: 'sun', icon: 'layers' }, 'anyone'),
    ).toBe(true);
  });

  it('takes two initials, without accents', () => {
    expect(memberInitials('Joana Melo')).toBe('JM');
    expect(memberInitials('André')).toBe('AN');
    expect(memberInitials('  ')).toBe('?');
  });

  it('removes a member without mutating the original list', () => {
    const withEditor = withMember(shared, editor);
    const withoutIt = withoutMember(withEditor, 'p-2');

    expect(withEditor.share?.members).toHaveLength(2);
    expect(withoutIt.share?.members).toHaveLength(1);
  });

  it('reads a token out of a bare token or a full link', () => {
    expect(parseInviteToken('7k2xazjm')).toBe('7k2xazjm');
    expect(parseInviteToken('ideias.app/p/7k2xazjm')).toBe('7k2xazjm');
    expect(parseInviteToken('https://ideias.app/p/7k2xazjm?x=1')).toBe(
      '7k2xazjm',
    );
    expect(parseInviteToken('')).toBeNull();
    expect(parseInviteToken('not a token at all!!')).toBeNull();
  });

  it('sanitizes a stored share, and drops one on the inbox', () => {
    const lists = sanitizeLists([
      {
        id: 'inbox',
        name: 'Caixa',
        color: 'sun',
        icon: 'inbox',
        share: shared.share,
      },
      { ...shared },
      {
        id: 'broken',
        name: 'Sem link',
        color: 'sun',
        icon: 'layers',
        share: { token: '' },
      },
    ]);

    expect(lists.find(list => list.id === 'inbox')?.share).toBeUndefined();
    expect(lists.find(list => list.id === 'lancamento')?.share?.token).toBe(
      '7k2xazjm',
    );
    expect(lists.find(list => list.id === 'broken')?.share).toBeUndefined();
  });
});
