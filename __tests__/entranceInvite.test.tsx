import { act, create } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { EntranceScreen } from '../src/features/auth/presentation/screens/EntranceScreen';
import { getAuthCopy } from '../src/features/auth/presentation/localization/authCopy';
import { lightTheme } from '../src/app/theme/theme';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';

const idle = { status: 'idle', errorKind: null } as const;

/** The entrance asks the invite endpoint for a preview; these tests answer in
 * its place. `globalThis` rather than `global` so the types are the ones the
 * app itself compiles against. */
const withFetch = globalThis as { fetch?: typeof fetch };

const mounted: ReturnType<typeof create>[] = [];

afterEach(() => {
  act(() => {
    while (mounted.length > 0) mounted.pop()?.unmount();
  });
  delete withFetch.fetch;
});

async function renderEntrance(inviteToken: string | null) {
  let tree: ReturnType<typeof create> | null = null;

  await act(async () => {
    tree = create(
      <ThemeProvider theme={lightTheme}>
        <EntranceScreen
          appleState={idle}
          copy={getAuthCopy('pt-BR')}
          demo={getTaskCopy('pt-BR').onboarding.demo}
          googleState={idle}
          inviteToken={inviteToken}
          onApple={jest.fn()}
          onEmail={jest.fn()}
          onGoogle={jest.fn()}
          onGuest={jest.fn()}
        />
      </ThemeProvider>,
    );
  });

  await act(async () => {
    await Promise.resolve();
  });

  const rendered = tree as unknown as ReturnType<typeof create>;
  mounted.push(rendered);
  return rendered;
}

function textOf(tree: ReturnType<typeof create>): string {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node != null && typeof node === 'object' && 'children' in node) {
      walk((node as { children: unknown }).children);
    }
  };
  walk(tree.toJSON());
  return out.join(' ');
}

describe('arriving by an invite link', () => {
  it('leads with the invite instead of the pitch', async () => {
    // The whole reason the preview endpoint exists: somebody can see what they
    // were invited to before deciding whether to create an account for it.
    withFetch.fetch = jest.fn(async () => ({
      status: 200,
      json: async () => ({
        token: '7k2xazjm',
        name: 'Casa',
        invitedBy: 'Júlia',
        memberCount: 1,
        openCount: 2,
        tasks: [
          { title: 'Montar o berço', done: false },
          { title: 'Chamar o encanador', done: true },
        ],
      }),
    })) as unknown as typeof fetch;

    const tree = await renderEntrance('7k2xazjm');
    const text = textOf(tree);

    expect(text).toContain('Júlia te chamou para o espaço Casa.');
    // Proof before the ask: real tasks from the space, open and closed.
    expect(text).toContain('Montar o berço');
    expect(text).toContain('Chamar o encanador');
    // The ways in stay where they were.
    expect(
      tree.root.findAllByProps({ testID: 'entrance-google' }).length,
    ).toBeGreaterThan(0);
    // The product pitch gives way to the invite.
    expect(
      tree.root.findAllByProps({ testID: 'entrance-cutout' }),
    ).toHaveLength(0);
  });

  it('says so when the link is no longer good', async () => {
    withFetch.fetch = jest.fn(async () => ({
      status: 404,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const tree = await renderEntrance('7k2xazjm');

    expect(textOf(tree)).toContain('Este convite expirou.');
    // Still a way in: the invite failing is not a reason to lock the door.
    expect(
      tree.root.findAllByProps({ testID: 'entrance-google' }).length,
    ).toBeGreaterThan(0);
  });

  it('shows the ordinary entrance when no link brought anybody here', async () => {
    const tree = await renderEntrance(null);

    expect(
      tree.root.findAllByProps({ testID: 'entrance-cutout' }).length,
    ).toBeGreaterThan(0);
    expect(textOf(tree)).toContain(getAuthCopy('pt-BR').entrance.headline);
  });
});
