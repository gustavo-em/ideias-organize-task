import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import styled, { ThemeProvider } from 'styled-components/native';

import { createEventBus } from '../shared/events/EventBus';
import type {
  TaskEvent,
  TaskEventBus,
} from '../features/tasks/domain/TaskEvent';
import type { Task } from '../features/tasks/domain/Task';
import { AuthGate } from '../features/auth/presentation/AuthGate';
import { getAuthCopy } from '../features/auth/presentation/localization/authCopy';
import { useAuthViewModel } from '../features/auth/presentation/view-models/useAuthViewModel';
import { firebaseAuthAdapter } from '../features/auth/infrastructure/firebase/firebaseAuthAdapter';
import type { AuthViewModel } from '../features/auth/presentation/view-models/useAuthViewModel';
import { systemClock } from '../features/tasks/infrastructure/clock/systemClock';
import { systemHaptics } from '../features/tasks/infrastructure/haptics/systemHaptics';
import { firestoreShareGateway } from '../features/tasks/infrastructure/sharing/firestoreShareGateway';
import { systemClipboard } from '../features/tasks/infrastructure/sharing/systemClipboard';
import {
  asyncStorageGroupStreakStore,
  asyncStorageListStore,
  asyncStorageProgressStore,
  asyncStorageTaskStore,
  asyncStorageTrioStore,
} from '../features/tasks/infrastructure/storage/asyncStorageStores';
import { consoleUsageReporter } from '../features/tasks/infrastructure/usage/consoleUsageReporter';
import { deriveMemberName } from '../features/tasks/presentation/models/memberIdentity';
import { FocusScreen } from '../features/tasks/presentation/screens/FocusScreen';
import { ListsScreen } from '../features/tasks/presentation/screens/ListsScreen';
import { ProgressScreen } from '../features/tasks/presentation/screens/ProgressScreen';
import { SettingsScreen } from '../features/tasks/presentation/screens/SettingsScreen';
import { TodayScreen } from '../features/tasks/presentation/screens/TodayScreen';
import { useFocusViewModel } from '../features/tasks/presentation/view-models/useFocusViewModel';
import { useTasksViewModel } from '../features/tasks/presentation/view-models/useTasksViewModel';
import { TabBar } from '../features/tasks/presentation/views/TabBar';
import {
  FocusGlyph,
  ListsGlyph,
  TodayGlyph,
  YouGlyph,
} from '../features/tasks/presentation/views/TabGlyphs';
import { TrioCelebration } from '../features/tasks/presentation/views/TrioCelebration';
import { AppSplash } from './components/AppSplash';
import { OnboardingScreen } from './components/OnboardingScreen';
import { APP_VERSION } from './config/appMetadata';
import { asyncStoragePreferencesStore } from './infrastructure/preferences/asyncStoragePreferencesStore';
import { getAppTheme } from './theme/theme';
import type { AppearanceMode } from './theme/theme';
import {
  useAppViewModel,
  type AppViewModel,
} from './view-models/useAppViewModel';

/**
 * The composition root.
 *
 * Every concrete adapter is built here and handed to the view models: this is
 * the only file in the app that knows AsyncStorage exists. Swapping storage
 * for a server, or the console reporter for a real analytics client, is a
 * change to these imports and to nothing else.
 */
function AppContent({
  app,
  auth,
  bus,
  onReady,
}: {
  app: AppViewModel;
  auth: AuthViewModel;
  bus: TaskEventBus;
  onReady: () => void;
}) {
  const identity = useMemo(
    () =>
      auth.user == null
        ? null
        : {
            personId: auth.user.uid,
            name: deriveMemberName(auth.user, app.copy.tabs.you),
          },
    [auth.user, app.copy],
  );

  const tasks = useTasksViewModel({
    bus,
    clock: systemClock,
    haptics: systemHaptics,
    listStore: asyncStorageListStore,
    progressStore: asyncStorageProgressStore,
    taskStore: asyncStorageTaskStore,
    trioStore: asyncStorageTrioStore,
    usageReporter: consoleUsageReporter,
    shareGateway: firestoreShareGateway,
    groupStreakStore: asyncStorageGroupStreakStore,
    clipboard: systemClipboard,
    identity,
    dayCapacity: app.dayCapacity,
  });
  const focus = useFocusViewModel({ bus, clock: systemClock });

  const [durationTask, setDurationTask] = useState<Task | null>(null);

  /**
   * Going from the list to a focus block.
   *
   * It lives here because it crosses two screens: the tab switch belongs to
   * the shell and the session belongs to the focus view model, so neither
   * screen can own it without reaching into the other. Nothing starts on this
   * side — the length is the first question on the other one.
   */
  const chooseFocusDurationFor = useCallback(
    (task: Task) => {
      setDurationTask(task);
      app.selectTab('focus');
    },
    [app],
  );

  useEffect(() => {
    if (tasks.isRestored) onReady();
  }, [onReady, tasks.isRestored]);

  return (
    <>
      <Safe edges={['top']}>
        {app.activeTab === 'today' ? (
          <TodayScreen
            copy={app.copy}
            language={app.language}
            onChooseFocusDuration={chooseFocusDurationFor}
            viewModel={tasks}
          />
        ) : null}

        {app.activeTab === 'lists' ? (
          <ListsScreen
            copy={app.copy}
            language={app.language}
            viewModel={tasks}
          />
        ) : null}

        {app.activeTab === 'focus' ? (
          <FocusScreen
            copy={app.copy}
            focus={focus}
            openDurationFor={durationTask}
            viewModel={tasks}
          />
        ) : null}

        {app.activeTab === 'you' ? (
          <YouTab>
            <ProgressScreen copy={app.copy} viewModel={tasks} />
            <SettingsScreen
              accountCopy={getAuthCopy(app.language)}
              appearanceMode={app.appearanceMode}
              copy={app.copy}
              dayCapacity={app.dayCapacity}
              language={app.language}
              onAppearanceModeChange={app.changeAppearanceMode}
              onDayCapacityChange={app.changeDayCapacity}
              onLanguageChange={app.changeLanguage}
              isAnonymous={auth.user?.isAnonymous ?? false}
              onSignOut={auth.signOut}
              userEmail={auth.user?.email ?? null}
              userName={auth.user?.displayName ?? null}
              version={APP_VERSION}
            />
          </YouTab>
        ) : null}
      </Safe>

      <BottomSafe edges={['bottom']}>
        <TabBar
          active={app.activeTab}
          items={[
            { id: 'today', label: app.copy.tabs.today, Glyph: TodayGlyph },
            { id: 'lists', label: app.copy.tabs.lists, Glyph: ListsGlyph },
            { id: 'focus', label: app.copy.tabs.focus, Glyph: FocusGlyph },
            { id: 'you', label: app.copy.tabs.you, Glyph: YouGlyph },
          ]}
          onSelect={app.selectTab}
        />
      </BottomSafe>

      {tasks.celebratingStreak == null ? null : (
        <TrioCelebration
          copy={app.copy}
          onClose={tasks.dismissCelebration}
          streakDays={tasks.celebratingStreak}
        />
      )}

      {/* The walk-through sits over the app rather than in front of it, so
          finishing lands on a day screen that is already built. */}
      {app.hasSeenOnboarding ? null : (
        <OnboardingScreen copy={app.copy} onFinish={app.finishOnboarding} />
      )}
    </>
  );
}

function AppShell({
  app,
  auth,
  appearanceMode,
  bus,
}: {
  app: AppViewModel;
  auth: AuthViewModel;
  appearanceMode: AppearanceMode;
  bus: TaskEventBus;
}) {
  const [isContentReady, setIsContentReady] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const handleContentReady = useCallback(() => setIsContentReady(true), []);

  // A saved session should open straight into the app, but "checking" can
  // never be allowed to hold the splash open forever — if the native auth
  // bridge has not answered within a few seconds, fall forward to the safe
  // default (the login screen) rather than freeze on the launch mark.
  useEffect(() => {
    if (auth.status !== 'checking') return;

    const timeout = setTimeout(() => setAuthTimedOut(true), 6000);
    return () => clearTimeout(timeout);
  }, [auth.status]);

  const authStatus =
    auth.status === 'checking' && authTimedOut ? 'signedOut' : auth.status;
  const isAuthResolved = authStatus !== 'checking';
  const isShellReady = app.isRestored && isAuthResolved;

  return (
    <Root>
      <StatusBar
        barStyle={appearanceMode === 'dark' ? 'light-content' : 'dark-content'}
      />

      {isShellReady && authStatus === 'signedIn' ? (
        <AppContent
          app={app}
          auth={auth}
          bus={bus}
          onReady={handleContentReady}
        />
      ) : null}

      {isShellReady && authStatus === 'signedOut' ? (
        <AuthGate
          auth={auth}
          copy={getAuthCopy(app.language)}
          onReady={handleContentReady}
        />
      ) : null}

      {isOpening ? (
        <AppSplash
          isReady={isShellReady && isContentReady}
          language={app.language}
          onFinished={() => setIsOpening(false)}
        />
      ) : null}
    </Root>
  );
}

export default function App() {
  const systemAppearance = useColorScheme();
  const bus = useMemo(
    () =>
      createEventBus<TaskEvent>({
        onListenerError: (error, type) => {
          if (!__DEV__) return;

          console.warn(`[events] listener failed for ${type}`, error);
        },
      }),
    [],
  );
  // The shell's state is created once, here, and handed down: two calls to the
  // same hook would be two independent apps disagreeing about the theme.
  const app = useAppViewModel(asyncStoragePreferencesStore, bus);
  // The only place that knows Firebase exists, matching the storage adapters
  // above: everything downstream depends on AuthPort, never on the SDK.
  const auth = useAuthViewModel(firebaseAuthAdapter);
  const openingAppearance = app.isRestored
    ? app.appearanceMode
    : systemAppearance === 'dark'
    ? 'dark'
    : 'light';

  return (
    <ThemeProvider theme={getAppTheme(openingAppearance)}>
      <SafeAreaProvider>
        <AppShell
          app={app}
          auth={auth}
          appearanceMode={openingAppearance}
          bus={bus}
        />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const Root = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Safe = styled(SafeAreaView)`
  flex: 1;
`;

const BottomSafe = styled(SafeAreaView)`
  background-color: ${({ theme }) => theme.colors.background};
`;

const YouTab = styled.View`
  flex: 1;
`;
