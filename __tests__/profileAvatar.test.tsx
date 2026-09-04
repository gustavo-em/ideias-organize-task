import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import type { AvatarPort } from '../src/features/auth/application/ports/AvatarPort';
import { AvatarOperationError } from '../src/features/auth/domain/AvatarError';
import { ProfileOperationError } from '../src/features/auth/domain/ProfileError';
import { createInMemoryProfileGateway } from '../src/features/auth/infrastructure/firebase/__mocks__/inMemoryProfileGateway';
import {
  useProfileViewModel,
  type ProfileViewModel,
} from '../src/features/auth/presentation/view-models/useProfileViewModel';
import { lightTheme } from '../src/app/theme/theme';
import { MemberChip } from '../src/features/tasks/presentation/views/MemberChip';
import { deriveMemberIdentity } from '../src/features/tasks/presentation/models/memberIdentity';

const GOOGLE_PHOTO = 'https://example.test/google.jpg';
const UPLOADED = 'https://example.test/avatars/uid-1.jpg?alt=media&token=abc';

function mount(
  port: ReturnType<typeof createInMemoryProfileGateway>,
  avatarPort: AvatarPort,
  photoURL: string | null,
): () => ProfileViewModel {
  let latest: ProfileViewModel | null = null;

  function Harness() {
    latest = useProfileViewModel({
      profilePort: port,
      avatarPort,
      user: {
        uid: 'uid-1',
        email: null,
        displayName: 'Gustavo Rosa',
        photoURL,
        isAnonymous: false,
      },
      fallbackName: 'Você',
    });

    return null;
  }

  act(() => {
    create(createElement(Harness));
  });

  return () => {
    if (latest == null) throw new Error('view model never rendered');
    return latest;
  };
}

const silentAvatarPort: AvatarPort = {
  pickAndUpload: async () => null,
  remove: async () => undefined,
};

describe('profile photo', () => {
  it("adopts the provider's photo with nobody being asked", async () => {
    const gateway = createInMemoryProfileGateway();
    const viewModel = mount(gateway, silentAvatarPort, GOOGLE_PHOTO);

    await act(async () => undefined);

    expect(viewModel().profile?.photoURL).toBe(GOOGLE_PHOTO);
    expect(viewModel().visibleProfile?.photoURL).toBe(GOOGLE_PHOTO);
    expect((await gateway.load('uid-1'))?.photoURL).toBe(GOOGLE_PHOTO);
  });

  it('keeps an uploaded photo when the name is saved again', async () => {
    const gateway = createInMemoryProfileGateway();
    const viewModel = mount(
      gateway,
      { ...silentAvatarPort, pickAndUpload: async () => UPLOADED },
      GOOGLE_PHOTO,
    );

    await act(async () => undefined);
    await act(async () => {
      await viewModel().changeAvatar();
    });
    expect(viewModel().profile?.photoURL).toBe(UPLOADED);

    await act(async () => {
      await viewModel().save('Gustavo', 'gu_rosa');
    });

    expect((await gateway.load('uid-1'))?.photoURL).toBe(UPLOADED);
  });

  it('says the photo could not be stored and leaves the profile standing', async () => {
    const gateway = createInMemoryProfileGateway();
    const viewModel = mount(
      gateway,
      {
        ...silentAvatarPort,
        pickAndUpload: async () => {
          throw new AvatarOperationError('storage-unavailable');
        },
      },
      GOOGLE_PHOTO,
    );

    await act(async () => undefined);
    await act(async () => {
      await viewModel().changeAvatar();
    });

    expect(viewModel().avatarErrorKind).toBe('storage-unavailable');
    expect(viewModel().avatarStatus).toBe('idle');
    // The Google photo carries on, exactly as before the attempt.
    expect(viewModel().profile?.photoURL).toBe(GOOGLE_PHOTO);
  });

  it('says nothing was saved when the profile refuses the photo field', async () => {
    const gateway = createInMemoryProfileGateway();
    const refusing = {
      ...gateway,
      savePhotoURL: async () => {
        throw new ProfileOperationError('refused');
      },
    };
    const viewModel = mount(
      refusing,
      { ...silentAvatarPort, pickAndUpload: async () => UPLOADED },
      GOOGLE_PHOTO,
    );

    await act(async () => undefined);
    await act(async () => {
      await viewModel().changeAvatar();
    });

    expect(viewModel().avatarErrorKind).toBe('network');
    // Nothing pretends to be saved: the avatar is what it was before.
    expect(viewModel().profile?.photoURL).toBe(GOOGLE_PHOTO);
  });

  it('falls back to the provider photo when the uploaded one is removed', async () => {
    const gateway = createInMemoryProfileGateway();
    const viewModel = mount(
      gateway,
      { ...silentAvatarPort, pickAndUpload: async () => UPLOADED },
      GOOGLE_PHOTO,
    );

    await act(async () => undefined);
    await act(async () => {
      await viewModel().changeAvatar();
    });
    await act(async () => {
      await viewModel().removeAvatar();
    });

    expect(viewModel().profile?.photoURL).toBe(GOOGLE_PHOTO);
    expect((await gateway.load('uid-1'))?.photoURL).toBeNull();
  });
});

describe('member chip fallback', () => {
  function render(photoURL: string | null, pending = false) {
    let tree: ReturnType<typeof create> | null = null;

    act(() => {
      tree = create(
        createElement(
          ThemeProvider,
          { theme: lightTheme },
          createElement(MemberChip, {
            name: 'Gustavo Rosa',
            personId: 'uid-1',
            photoURL,
            pending,
            size: 'large' as const,
          }),
        ),
      );
    });

    if (tree == null) throw new Error('chip never rendered');

    return tree as ReturnType<typeof create>;
  }

  it('always keeps the initials under the photo', () => {
    const tree = render(UPLOADED);
    const letters = tree.root.findAllByProps({ children: 'GR' });

    expect(letters.length).toBeGreaterThan(0);
    expect(
      tree.root.findAllByProps({ testID: 'member-chip-photo' }).length,
    ).toBeGreaterThan(0);
  });

  it('shows nothing but the initials without a photo, and never for a pending invite', () => {
    expect(
      render(null).root.findAllByProps({ testID: 'member-chip-photo' }),
    ).toHaveLength(0);
    expect(
      render(UPLOADED, true).root.findAllByProps({
        testID: 'member-chip-photo',
      }),
    ).toHaveLength(0);
  });
});

describe('member identity', () => {
  it('carries the photo the other members see', () => {
    expect(
      deriveMemberIdentity(
        { displayName: 'Gustavo', handle: 'gu_rosa', photoURL: UPLOADED },
        'Gustavo Rosa',
        'Você',
        GOOGLE_PHOTO,
      ).photoURL,
    ).toBe(UPLOADED);

    // Before the profile is read, the provider's own photo stands in.
    expect(
      deriveMemberIdentity(null, 'Gustavo Rosa', 'Você', GOOGLE_PHOTO).photoURL,
    ).toBe(GOOGLE_PHOTO);
  });
});
