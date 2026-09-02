import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { lightTheme } from '../src/app/theme/theme';
import type {
  ListMember,
  TaskList,
} from '../src/features/tasks/domain/TaskList';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';
import {
  formatJoinedAt,
  JOIN_HISTORY_LIMIT,
  joinHistory,
} from '../src/features/tasks/presentation/models/joinHistory';
import { ShareSheet } from '../src/features/tasks/presentation/views/ShareSheet';

/**
 * Who came into a shared project, and when.
 *
 * The order is the point: the last person in is read first, and somebody
 * recorded before the moment was kept shows a dash instead of a date the app
 * invented for them.
 */

const copy = getTaskCopy('pt-BR');
const NOW = new Date(2026, 2, 12, 14, 5, 0).getTime();

function member(
  personId: string,
  joinedAtMs?: number,
  overrides: Partial<ListMember> = {},
): ListMember {
  return {
    personId,
    name: personId,
    handle: null,
    role: 'editor',
    joined: true,
    ...(joinedAtMs == null ? {} : { joinedAtMs }),
    ...overrides,
  };
}

describe('joinHistory', () => {
  it('reads from the most recent entry to the oldest', () => {
    const history = joinHistory(
      [
        member('ana', NOW - 60_000),
        member('bia', NOW),
        member('caio', NOW - 120_000),
      ],
      'pt-BR',
    );

    expect(history.entries.map(entry => entry.member.personId)).toEqual([
      'bia',
      'ana',
      'caio',
    ]);
    expect(history.truncated).toBe(false);
  });

  it('sends a member without a recorded moment to the end, with no date', () => {
    const history = joinHistory(
      [member('antiga'), member('nova', NOW)],
      'pt-BR',
    );

    expect(history.entries.map(entry => entry.member.personId)).toEqual([
      'nova',
      'antiga',
    ]);
    expect(history.entries[1].when).toBeNull();
  });

  it('leaves out an invite nobody accepted', () => {
    const history = joinHistory(
      [member('dentro', NOW), member('convidada', NOW, { joined: false })],
      'pt-BR',
    );

    expect(history.entries).toHaveLength(1);
    expect(history.total).toBe(1);
  });

  it('writes the moment in the language on screen, without Intl', () => {
    expect(formatJoinedAt(NOW, 'pt-BR')).toBe('12 mar, 14:05');
    expect(formatJoinedAt(NOW, 'en-US')).toBe('Mar 12, 2:05 PM');
    expect(
      formatJoinedAt(new Date(2026, 2, 12, 0, 7, 0).getTime(), 'en-US'),
    ).toBe('Mar 12, 12:07 AM');
    expect(formatJoinedAt(undefined, 'pt-BR')).toBeNull();
    expect(formatJoinedAt(Number.NaN, 'pt-BR')).toBeNull();
  });

  it('shows only the ten most recent when there are more', () => {
    const many = Array.from({ length: 14 }, (_, index) =>
      member(`p-${index}`, NOW - index * 60_000),
    );
    const history = joinHistory(many, 'pt-BR');

    expect(history.entries).toHaveLength(JOIN_HISTORY_LIMIT);
    expect(history.entries[0].member.personId).toBe('p-0');
    expect(history.total).toBe(14);
    expect(history.truncated).toBe(true);
  });
});

function texts(root: ReactTestInstance): string[] {
  return root
    .findAll(node => String(node.type) === 'Text')
    .flatMap(node =>
      node.children.filter(
        (child): child is string => typeof child === 'string',
      ),
    );
}

function renderSheet(list: TaskList) {
  let tree!: ReturnType<typeof create>;

  act(() => {
    tree = create(
      <ThemeProvider theme={lightTheme}>
        <ShareSheet
          copy={copy}
          errorKind={null}
          identity={null}
          language="pt-BR"
          list={list}
          onCancel={() => {}}
          onChangeInvitedAs={() => {}}
          onCopyLink={() => {}}
          onCreateLink={() => {}}
          onInvite={() => {}}
          onRemoveMember={() => {}}
          onStopSharing={() => {}}
          personId="dona"
          status="idle"
        />
      </ThemeProvider>,
    );
  });

  return tree;
}

describe('ShareSheet join history', () => {
  it('shows a dash for the member with no recorded moment', () => {
    const list: TaskList = {
      id: 'casa',
      name: 'Casa',
      color: 'mint',
      icon: 'home',
      share: {
        token: 'abc123',
        invitedAs: 'editor',
        members: [
          member('dona', NOW, { role: 'owner' }),
          member('antiga', undefined, { name: 'Antiga' }),
        ],
      },
    };

    const tree = renderSheet(list);
    const printed = texts(tree.root);

    expect(
      printed.some(text =>
        text.startsWith(copy.lists.joinHistoryHeader.toUpperCase()),
      ),
    ).toBe(true);
    expect(printed).toContain(copy.lists.joinedAtUnknown);

    act(() => tree.unmount());
  });

  it('has no history at all before the project is shared', () => {
    const list: TaskList = {
      id: 'casa',
      name: 'Casa',
      color: 'mint',
      icon: 'home',
    };

    const tree = renderSheet(list);

    expect(
      tree.root.findAll(node => node.props?.testID === 'share-join-history', {
        deep: true,
      }),
    ).toHaveLength(0);

    act(() => tree.unmount());
  });
});
