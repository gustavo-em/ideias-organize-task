import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from 'styled-components/native';

import { lightTheme } from '../src/app/theme/theme';
import type { UserProfile } from '../src/features/auth/domain/UserProfile';
import { getAuthCopy } from '../src/features/auth/presentation/localization/authCopy';
import { ProfileScreen } from '../src/features/auth/presentation/screens/ProfileScreen';
import { AccountSection } from '../src/features/auth/presentation/views/AccountSection';

const copy = getAuthCopy('pt-BR');

const profile: UserProfile = {
  uid: 'uid-1',
  displayName: 'Gustavo Rosa',
  handle: 'gustavo',
  photoURL: null,
};

function renderAccount(onEditProfile: () => void) {
  let tree: ReactTestRenderer | null = null;

  act(() => {
    tree = create(
      <ThemeProvider theme={lightTheme}>
        <AccountSection
          copy={copy}
          isAnonymous={false}
          onEditProfile={onEditProfile}
          personId="uid-1"
          profile={profile}
          profileSaved={false}
          tabLabel="Você"
        />
      </ThemeProvider>,
    );
  });

  return tree as unknown as ReactTestRenderer;
}

function renderProfile(overrides: {
  errorKind?: 'handle-taken' | null;
  onBack?: () => void;
  onSubmit?: (displayName: string, handle: string) => Promise<boolean>;
}) {
  let tree: ReactTestRenderer | null = null;

  act(() => {
    tree = create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}
      >
        <ThemeProvider theme={lightTheme}>
          <ProfileScreen
            avatarBusy={false}
            avatarErrorKind={null}
            copy={copy}
            errorKind={overrides.errorKind ?? null}
            fallbackName="Você"
            onBack={overrides.onBack ?? (() => undefined)}
            onChangeAvatar={() => undefined}
            onRemoveAvatar={() => undefined}
            onSubmit={overrides.onSubmit ?? (async () => true)}
            personId="uid-1"
            profile={profile}
            saving={false}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });

  return tree as unknown as ReactTestRenderer;
}

describe('the account block of the Você tab', () => {
  it('carries the tab header and the identity row, in that order', () => {
    const tree = renderAccount(() => undefined);
    const ids = tree.root
      .findAll(node => typeof node.props.testID === 'string', {
        deep: true,
      })
      .map(node => node.props.testID as string);

    expect(ids.indexOf('you-header')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('you-header')).toBeLessThan(
      ids.indexOf('settings-profile'),
    );
  });

  it('opens the profile screen from the whole row', () => {
    const opened = jest.fn();
    const tree = renderAccount(opened);

    act(() => {
      tree.root.findByProps({ testID: 'settings-profile' }).props.onPress();
    });

    expect(opened).toHaveBeenCalledTimes(1);
  });
});

describe('the profile screen', () => {
  it('goes back without saving anything', () => {
    const back = jest.fn();
    const tree = renderProfile({ onBack: back });

    act(() => {
      tree.root.findByProps({ testID: 'profile-back' }).props.onPress();
    });

    expect(back).toHaveBeenCalledTimes(1);
  });

  it('keeps what was typed when the handle is already taken', () => {
    const tree = renderProfile({ errorKind: 'handle-taken' });

    act(() => {
      tree.root
        .findByProps({ testID: 'profile-handle' })
        .props.onChangeText('gustavo_rosa');
    });

    expect(
      tree.root.findByProps({ testID: 'profile-handle' }).props.value,
    ).toBe('gustavo_rosa');

    // The refusal belongs to the handle that was sent, so a new one clears it.
    expect(tree.root.findAllByProps({ testID: 'profile-error' })).toHaveLength(
      0,
    );
  });

  it('shows the refusal under the handle field, with the text still there', () => {
    const tree = renderProfile({ errorKind: 'handle-taken' });

    expect(
      tree.root.findByProps({ testID: 'profile-handle' }).props.value,
    ).toBe('gustavo');
    expect(
      tree.root.findAllByProps({ testID: 'profile-error' }).length,
    ).toBeGreaterThan(0);
  });

  it('leaves the screen once the save lands', async () => {
    const back = jest.fn();
    const tree = renderProfile({
      onBack: back,
      onSubmit: async () => true,
    });

    act(() => {
      tree.root
        .findByProps({ testID: 'profile-display-name' })
        .props.onChangeText('Gustavo R');
    });

    await act(async () => {
      await tree.root.findByProps({ testID: 'profile-submit' }).props.onPress();
    });

    expect(back).toHaveBeenCalledTimes(1);
  });
});
