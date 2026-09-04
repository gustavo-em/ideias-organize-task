jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
jest.mock('@react-native-firebase/auth', () => ({
  getAuth: () => ({
    currentUser: {
      uid: 'uid-1',
      displayName: 'Gustavo',
      getIdToken: async () => 'token',
    },
  }),
  updateProfile: async () => undefined,
}));

import { ProfileOperationError } from '../src/features/auth/domain/ProfileError';
import { firestoreProfileAdapter } from '../src/features/auth/infrastructure/firebase/firestoreProfileAdapter';

interface CommitCall {
  url: string;
  writes: Array<Record<string, any>>;
}

function mockFetch(
  status: number,
  failureStatus: string | null = null,
): { calls: CommitCall[] } {
  const calls: CommitCall[] = [];

  globalThis.fetch = jest.fn(async (url: any, init: any) => {
    if (init?.body != null) {
      calls.push({
        url: String(url),
        writes: JSON.parse(String(init.body)).writes,
      });
    }

    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () =>
        failureStatus == null ? {} : { error: { status: failureStatus } },
    };
  }) as unknown as typeof fetch;

  return { calls };
}

describe('firestore handle reservation', () => {
  it('takes the new handle and frees the old one in a single commit', async () => {
    const { calls } = mockFetch(200);

    await firestoreProfileAdapter.save({
      uid: 'uid-1',
      displayName: 'Gustavo',
      handle: 'handle_b',
      previousHandle: 'handle_a',
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain(':commit');

    const [reserve, release, profile] = calls[0].writes;

    // The reservation refuses to overwrite: whoever commits first keeps it.
    expect(reserve.update.name).toContain('usernames/handle_b');
    expect(reserve.currentDocument).toEqual({ exists: false });
    // Releasing carries no precondition: a reservation that is already gone
    // must not stop somebody from changing their handle.
    expect(release.delete).toContain('usernames/handle_a');
    expect(release.currentDocument).toBeUndefined();
    expect(profile.update.name).toContain('users/uid-1');
  });

  it('writes no reservation when only the display name changes', async () => {
    const { calls } = mockFetch(200);

    await firestoreProfileAdapter.save({
      uid: 'uid-1',
      displayName: 'Gu',
      handle: 'handle_a',
      previousHandle: 'handle_a',
    });

    expect(calls[0].writes).toHaveLength(1);
    expect(calls[0].writes[0].update.name).toContain('users/uid-1');
  });

  it('reads a refused precondition as the handle being taken', async () => {
    mockFetch(400, 'FAILED_PRECONDITION');

    await expect(
      firestoreProfileAdapter.save({
        uid: 'uid-1',
        displayName: 'Gustavo',
        handle: 'taken',
        previousHandle: 'handle_a',
      }),
    ).rejects.toEqual(new ProfileOperationError('handle-taken'));
  });

  it('does not blame the handle for a rejection that is not a precondition', async () => {
    mockFetch(400, 'INVALID_ARGUMENT');

    await expect(
      firestoreProfileAdapter.save({
        uid: 'uid-1',
        displayName: 'Gustavo',
        handle: 'gu_rosa',
        previousHandle: 'handle_a',
      }),
    ).rejects.toEqual(new ProfileOperationError('network'));
  });

  it('releases the stored handle even when the caller does not know it', async () => {
    const calls: CommitCall[] = [];

    globalThis.fetch = jest.fn(async (url: any, init: any) => {
      const isCommit = String(url).includes(':commit');
      if (isCommit) {
        calls.push({
          url: String(url),
          writes: JSON.parse(String(init.body)).writes,
        });
      }

      return {
        ok: true,
        status: 200,
        json: async () =>
          isCommit
            ? {}
            : {
                fields: {
                  displayName: { stringValue: 'Gustavo' },
                  handle: { stringValue: 'stored_handle' },
                },
              },
      };
    }) as unknown as typeof fetch;

    await firestoreProfileAdapter.save({
      uid: 'uid-1',
      displayName: 'Gustavo',
      handle: 'handle_b',
      previousHandle: null,
    });

    expect(
      calls[0].writes.some(
        write => write.delete != null && write.delete.includes('stored_handle'),
      ),
    ).toBe(true);
  });
});

describe('renaming yourself inside a shared project', () => {
  it('writes only the members array, guarded by the updateTime it read', async () => {
    const calls: CommitCall[] = [];

    globalThis.fetch = jest.fn(async (url: any, init: any) => {
      const isCommit = String(url).includes(':commit');
      if (isCommit) {
        calls.push({
          url: String(url),
          writes: JSON.parse(String(init.body)).writes,
        });
      }

      return {
        ok: true,
        status: 200,
        json: async () =>
          isCommit
            ? {}
            : {
                updateTime: '2026-09-01T10:00:00Z',
                fields: {
                  members: {
                    arrayValue: {
                      values: [
                        {
                          mapValue: {
                            fields: {
                              personId: { stringValue: 'uid-1' },
                              name: { stringValue: 'tester+share5' },
                              role: { stringValue: 'owner' },
                              joined: { booleanValue: true },
                            },
                          },
                        },
                        // An entry this version does not understand: it must
                        // come back exactly as it was.
                        {
                          mapValue: {
                            fields: { future: { stringValue: 'x' } },
                          },
                        },
                      ],
                    },
                  },
                },
              },
      };
    }) as unknown as typeof fetch;

    const {
      firestoreShareGateway,
    } = require('../src/features/tasks/infrastructure/sharing/firestoreShareGateway');

    await firestoreShareGateway.updateMemberIdentity(
      { token: '7k2xazjm', invitedAs: 'editor', members: [] },
      {
        personId: 'uid-1',
        name: 'Gustavo Rosa',
        handle: 'gu_rosa',
        role: 'owner',
        joined: true,
      },
    );

    expect(calls).toHaveLength(1);
    const [write] = calls[0].writes;

    expect(write.updateMask).toEqual({ fieldPaths: ['members'] });
    expect(write.currentDocument).toEqual({
      updateTime: '2026-09-01T10:00:00Z',
    });

    const values = write.update.fields.members.arrayValue.values;
    expect(values[0].mapValue.fields.name).toEqual({
      stringValue: 'Gustavo Rosa',
    });
    expect(values[0].mapValue.fields.handle).toEqual({
      stringValue: 'gu_rosa',
    });
    expect(values[0].mapValue.fields.role).toEqual({ stringValue: 'owner' });
    expect(values[1].mapValue.fields.future).toEqual({ stringValue: 'x' });
  });
});
