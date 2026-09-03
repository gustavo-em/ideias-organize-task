import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import styled, { ThemeProvider } from 'styled-components/native';

import { createEventBus } from '../shared/events/EventBus';
import type {
  TaskEvent,
  TaskEventBus,
} from '../features/tasks/domain/TaskEvent';
import { isCompleted, type Task } from '../features/tasks/domain/Task';
import { AuthGate } from '../features/auth/presentation/AuthGate';
import { getAuthCopy } from '../features/auth/presentation/localization/authCopy';
import { useAuthViewModel } from '../features/auth/presentation/view-models/useAuthViewModel';
import { firebaseAuthAdapter } from '../features/auth/infrastructure/firebase/firebaseAuthAdapter';
import { firestoreProfileAdapter } from '../features/auth/infrastructure/firebase/firestoreProfileAdapter';
import { imagePickerAvatarAdapter } from '../features/auth/infrastructure/firebase/imagePickerAvatarAdapter';
import { useProfileViewModel } from '../features/auth/presentation/view-models/useProfileViewModel';
import { ProfileScreen } from '../features/auth/presentation/screens/ProfileScreen';
import { AccountSection } from '../features/auth/presentation/views/AccountSection';
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
  clearDataOwner,
  clearLocalTaskData,
} from '../features/tasks/infrastructure/storage/asyncStorageStores';
import { consoleUsageReporter } from '../features/tasks/infrastructure/usage/consoleUsageReporter';
import { deriveMemberIdentity } from '../features/tasks/presentation/models/memberIdentity';
import { FocusScreen } from '../features/tasks/presentation/screens/FocusScreen';
import { ListsScreen } from '../features/tasks/presentation/screens/ListsScreen';
import { ProgressScreen } from '../features/tasks/presentation/screens/ProgressScreen';
import { SettingsScreen } from '../features/tasks/presentation/screens/SettingsScreen';
import { TodayScreen } from '../features/tasks/presentation/screens/TodayScreen';
import { useFocusViewModel } from '../features/tasks/presentation/view-models/useFocusViewModel';
import { useProjectActivity } from '../features/tasks/presentation/view-models/useProjectActivity';
import { useTasksViewModel } from '../features/tasks/presentation/view-models/useTasksViewModel';
import { TabBar } from '../features/tasks/presentation/views/TabBar';
import {
  ListsGlyph,
  TodayGlyph,
  YouGlyph,
} from '../features/tasks/presentation/views/TabGlyphs';
import { FocusOverlay } from '../features/tasks/presentation/views/FocusOverlay';
import { TrioCelebration } from '../features/tasks/presentation/views/TrioCelebration';
import { SCREEN_ENTER } from './animation/motion';
import { AppSplash } from './components/AppSplash';
import {
  OnboardingScreen,
  type OnboardingOutcome,
} from './components/OnboardingScreen';
import { APP_VERSION } from './config/appMetadata';
import { asyncStoragePreferencesStore } from './infrastructure/preferences/asyncStoragePreferencesStore';
import { useLocalDataOwner } from './session/useLocalDataOwner';
import { getAppTheme } from './theme/theme';
import type { AppearanceMode } from './theme/theme';
import {
  useAppViewModel,
  type AppViewModel,
} from './view-models/useAppViewModel';

/**
 * Everything the account that just left wrote here, removed.
 *
 * The wait is not cosmetic: the last save of a session is emitted by the
 * persistence subscriber's cleanup while the screens unmount, so the removals
 * have to be queued behind it or the wiped keys come straight back.
 */
async function wipeLocalSession(): Promise<void> {
  await new Promise<void>(resolve => {
    setTimeout(resolve, 0);
  });
  await clearLocalTaskData();
  await clearDataOwner();
}

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
  inviteIntent,
  onInviteIntentDone,
  onReady,
  onReplayOnboarding,
}: {
  app: AppViewModel;
  auth: AuthViewModel;
  bus: TaskEventBus;
  /** Somebody asked to invite on the walk-through and has an account now: the
   * space and its invite are made here, without another question. */
  inviteIntent: boolean;
  onInviteIntentDone: () => void;
  onReady: () => void;
  /** Reopens the walk-through from settings. The shell owns it, because the
   * same screen also covers the signed-out side. */
  onReplayOnboarding: () => void;
}) {
  const profile = useProfileViewModel({
    profilePort: firestoreProfileAdapter,
    avatarPort: imagePickerAvatarAdapter,
    user: auth.user,
    fallbackName: app.copy.tabs.you,
  });
  // The Você tab has one place to go: the profile screen, pushed over it.
  const [youRoute, setYouRoute] = useState<'root' | 'profile'>('root');

  const identity = useMemo(
    () =>
      auth.user == null
        ? null
        : {
            personId: auth.user.uid,
            ...deriveMemberIdentity(
              profile.visibleProfile,
              auth.user.displayName,
              app.copy.tabs.you,
              auth.user.photoURL,
            ),
          },
    [auth.user, app.copy, profile.visibleProfile],
  );

  // The confirmation is a line in the account group, not a screen of its own:
  // it says the save landed and then gets out of the way.
  const { status: profileStatus, dismissSaved } = profile;

  useEffect(() => {
    if (profileStatus !== 'saved') return;

    // Only the status and the callback matter: depending on the whole view
    // model would restart the timer on every render of the shell.
    const timeout = setTimeout(dismissSaved, 2500);
    return () => clearTimeout(timeout);
  }, [dismissSaved, profileStatus]);

  const activity = useProjectActivity({
    enabled: app.projectActivityNotifications,
    language: app.language,
    personId: auth.user?.uid ?? null,
    onPermissionAsked: app.markActivityPermissionAsked,
    onEnabledChange: app.changeProjectActivityNotifications,
  });

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
    language: app.language,
    dayCapacity: app.dayCapacity,
    onRemoteProject: activity.onRemoteProject,
  });
  const focus = useFocusViewModel({ bus, clock: systemClock });

  const [durationTask, setDurationTask] = useState<Task | null>(null);
  const [isFocusOpen, setIsFocusOpen] = useState(false);

  /**
   * Going from the list to a focus block.
   *
   * It lives here because it crosses two screens: the layer belongs to the
   * shell and the session belongs to the focus view model, so neither screen
   * can own it without reaching into the other. Nothing starts on this side —
   * the length is the first question on the other one.
   */
  const chooseFocusDurationFor = useCallback((task: Task) => {
    setDurationTask(task);
    setIsFocusOpen(true);
  }, []);

  const closeFocus = useCallback(() => {
    setIsFocusOpen(false);
    setDurationTask(null);
  }, []);

  const focusSession = focus.session;
  const focusedTask = tasks.tasks.find(
    entry => entry.id === focusSession?.taskId,
  );
  const hadSession = useRef(false);

  // A block that ends anywhere — the stop button, the complete button — sends
  // the person back to the list. Closing the layer never does the reverse.
  useEffect(() => {
    if (focusSession != null) {
      hadSession.current = true;
      return;
    }

    if (!hadSession.current) return;

    hadSession.current = false;
    setIsFocusOpen(false);
    setDurationTask(null);
  }, [focusSession]);

  // Ticking the box in the list is still the natural way to finish a task, so
  // it cannot leave a block running on something already done.
  useEffect(() => {
    if (focusSession == null || focusedTask == null) return;
    if (!isCompleted(focusedTask)) return;

    focus.stop();
  }, [focus, focusSession, focusedTask]);

  const focusRow = useMemo(
    () =>
      focusSession == null
        ? null
        : {
            taskId: focusSession.taskId,
            label: focus.label,
            phase: focusSession.phase,
            onOpen: () => setIsFocusOpen(true),
          },
    [focus.label, focusSession],
  );

  useEffect(() => {
    if (tasks.isRestored) onReady();
  }, [onReady, tasks.isRestored]);

  // The answer given before the account is honoured as soon as there is one:
  // the spaces tab is where the new space and its invite appear.
  const selectTab = app.selectTab;

  useEffect(() => {
    if (!inviteIntent || !tasks.isRestored) return;

    selectTab('lists');
  }, [inviteIntent, selectTab, tasks.isRestored]);

  // Leaving the account takes this account's data off the device with it. The
  // wipe is deferred past this tick on purpose: ending the session unmounts the
  // screens, and the persistence subscriber flushes one last save on the way
  // out — running the removals first would only have them written back.
  // A refused sign-out keeps both the session and its data: nothing was left
  // behind for anybody else to read, and there is no server copy to restore
  // from, so wiping there would only destroy the day of the person still
  // signed in. Sessions that end any other way are covered by the shell.
  const signOut = useCallback(async () => {
    await auth.signOut();
    await wipeLocalSession();
  }, [auth]);

  const behindProfile = youRoute === 'profile';
  // Taking the column out of the layout is what removes it from the Android
  // accessibility tree, but doing it on the same frame would empty the window
  // while the profile screen is still sliding in from the right. The screen
  // arrives first; the tab goes out from under it.
  const [tabHidden, setTabHidden] = useState(false);

  useEffect(() => {
    if (!behindProfile) {
      setTabHidden(false);
      return;
    }

    const timeout = setTimeout(() => setTabHidden(true), SCREEN_ENTER.duration);
    return () => clearTimeout(timeout);
  }, [behindProfile]);

  return (
    <>
      {/* `accessibilityViewIsModal` is iOS only, and the Android flags on a
          wrapper still left the tab readable underneath. Taking the whole
          column out of the layout is what actually removes it from the tree —
          and `display: none` keeps every screen mounted, so coming back lands
          on the same scroll instead of replaying the tab. */}
      <View
        accessibilityElementsHidden={behindProfile}
        collapsable={false}
        importantForAccessibility={
          behindProfile ? 'no-hide-descendants' : 'auto'
        }
        style={tabHidden ? styles.beneathHidden : styles.beneath}
      >
        <Safe edges={['top']}>
          {app.activeTab === 'today' ? (
            <TodayScreen
              copy={app.copy}
              focus={focusRow}
              language={app.language}
              onChooseFocusDuration={chooseFocusDurationFor}
              viewModel={tasks}
            />
          ) : null}

          {app.activeTab === 'lists' ? (
            <ListsScreen
              autoInvite={inviteIntent}
              copy={app.copy}
              language={app.language}
              onAutoInviteDone={onInviteIntentDone}
              notificationPrompt={{
                // The ask happens where the news comes from, and only for
                // someone who actually shares a project.
                visible:
                  app.projectActivityNotifications &&
                  !app.hasAskedActivityPermission,
                onEnable: activity.enableNotifications,
                onDismiss: app.markActivityPermissionAsked,
              }}
              ownProfile={profile.profile}
              viewModel={tasks}
            />
          ) : null}

          {app.activeTab === 'you' ? (
            <YouTab
              contentContainerStyle={styles.youTab}
              showsVerticalScrollIndicator={false}
            >
              {/* Who this account is comes first: the numbers and the settings
                are what follows it. */}
              <AccountSection
                copy={getAuthCopy(app.language)}
                isAnonymous={auth.user?.isAnonymous ?? false}
                onEditProfile={() => setYouRoute('profile')}
                personId={auth.user?.uid ?? null}
                profile={profile.profile}
                profileSaved={profileStatus === 'saved'}
                tabLabel={app.copy.tabs.you}
              />
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
                onReplayOnboarding={onReplayOnboarding}
                onSignOut={signOut}
                personId={auth.user?.uid ?? null}
                projectActivityNotifications={app.projectActivityNotifications}
                projectActivityBlocked={activity.isAllowed === false}
                onProjectActivityNotificationsChange={activity.setEnabled}
                onOpenNotificationSettings={activity.openSystemSettings}
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
              { id: 'you', label: app.copy.tabs.you, Glyph: YouGlyph },
            ]}
            onSelect={app.selectTab}
          />
        </BottomSafe>
      </View>

      {/* The session covers the list and the tab bar whole: a block is not one
          destination among others, it is the only thing on screen while it is
          open. */}
      {isFocusOpen ? (
        <FocusOverlay
          label={app.copy.focus.close}
          onClose={closeFocus}
          onSessionGround={focusSession != null}
        >
          <FocusScreen
            copy={app.copy}
            focus={focus}
            openDurationFor={durationTask}
            viewModel={tasks}
          />
        </FocusOverlay>
      ) : null}

      {tasks.celebratingStreak == null ? null : (
        <TrioCelebration
          copy={app.copy}
          onClose={tasks.dismissCelebration}
          streakDays={tasks.celebratingStreak}
        />
      )}

      {/* The profile is a screen of its own, over the tab bar: naming yourself
          is typing, and typing needs the whole window. */}
      {youRoute === 'profile' && auth.user != null ? (
        <ProfileScreen
          copy={getAuthCopy(app.language)}
          errorKind={profile.errorKind}
          fallbackName={app.copy.tabs.you}
          onBack={() => setYouRoute('root')}
          onChangeAvatar={profile.changeAvatar}
          onRemoveAvatar={profile.removeAvatar}
          onSubmit={profile.save}
          personId={auth.user.uid}
          profile={profile.profile}
          avatarBusy={profile.avatarStatus === 'working'}
          avatarErrorKind={profile.avatarErrorKind}
          saving={profileStatus === 'saving'}
        />
      ) : null}
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
  const [isReplayingOnboarding, setIsReplayingOnboarding] = useState(false);
  // Held in memory only: an app that dies before the account is created opens
  // the normal way next time, with no half-finished invite waiting.
  const [inviteIntent, setInviteIntent] = useState(false);
  const handleContentReady = useCallback(() => setIsContentReady(true), []);
  const replayOnboarding = useCallback(
    () => setIsReplayingOnboarding(true),
    [],
  );

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
  const personId = auth.user?.uid ?? null;
  const hadSession = useRef(false);

  // The session can also end without the settings button: a revoked token, a
  // deleted account. However it ends, the device stops holding that account's
  // day — and this runs after the screens have unmounted and flushed.
  useEffect(() => {
    if (authStatus === 'signedIn') {
      hadSession.current = true;
      return;
    }

    if (authStatus !== 'signedOut' || !hadSession.current) return;

    hadSession.current = false;
    wipeLocalSession().catch(() => {
      // The next sign-in checks the owner again and wipes there.
    });
  }, [authStatus]);
  // Nothing of the previous account may be drawn before this answers: a
  // different owner wipes the device's copy first.
  const dataOwnerStatus = useLocalDataOwner(
    authStatus === 'signedIn' ? personId : null,
  );
  const isAuthResolved = authStatus !== 'checking';
  const isShellReady = app.isRestored && isAuthResolved;
  // The walk-through comes before the account: on a clean device it covers the
  // sign-in screen, and it only comes back when settings ask for it. A restored
  // session still gets it once — the flag lives on this device, so a keychain
  // session with no local preferences is also a first opening.
  const isShowingOnboarding =
    isShellReady && (isReplayingOnboarding || !app.hasSeenOnboarding);

  // Both answers close the walk-through for good: the step is not a question
  // anybody has to answer twice. Only the invite leaves something to do after.
  const finishOnboarding = (outcome: OnboardingOutcome) => {
    setIsReplayingOnboarding(false);
    if (!app.hasSeenOnboarding) app.finishOnboarding();
    if (outcome === 'invite') setInviteIntent(true);
  };

  const clearInviteIntent = useCallback(() => setInviteIntent(false), []);

  return (
    <Root>
      <StatusBar
        barStyle={appearanceMode === 'dark' ? 'light-content' : 'dark-content'}
      />

      {/* While the walk-through covers the app, what is under it is out of the
          accessibility tree as well. The flags alone still left the tabs and
          the settings buttons in the node dump, so the layer is also taken out
          of layout with `display: none` — the screens stay mounted, so nothing
          is lost when the walk-through closes. */}
      <View
        accessibilityElementsHidden={isShowingOnboarding}
        importantForAccessibility={
          isShowingOnboarding ? 'no-hide-descendants' : 'auto'
        }
        pointerEvents={isShowingOnboarding ? 'none' : 'auto'}
        style={isShowingOnboarding ? styles.beneathHidden : styles.beneath}
      >
        {isShellReady &&
        authStatus === 'signedIn' &&
        dataOwnerStatus === 'ready' ? (
          <AppContent
            app={app}
            auth={auth}
            bus={bus}
            inviteIntent={inviteIntent}
            /* One account, one mount: remounting on the uid drops the previous
               session's tasks from memory, not only from storage. */
            key={personId ?? 'anon'}
            onInviteIntentDone={clearInviteIntent}
            onReady={handleContentReady}
            onReplayOnboarding={replayOnboarding}
          />
        ) : null}

        {isShellReady && authStatus === 'signedOut' ? (
          <AuthGate
            auth={auth}
            copy={getAuthCopy(app.language)}
            onReady={handleContentReady}
          />
        ) : null}
      </View>

      {isShowingOnboarding ? (
        <OnboardingScreen copy={app.copy} onFinish={finishOnboarding} />
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
  // The app opens light, always: the phone's own theme is not a preference
  // anybody set here, and following it made a clean install open dark before
  // the stored choice came back.
  const openingAppearance: AppearanceMode = app.isRestored
    ? app.appearanceMode
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

/* One scroll for the whole tab: the rhythm block and the settings group share a
   single column, so neither can be clipped by the other. */
const YouTab = styled.ScrollView`
  flex: 1;
`;

const styles = StyleSheet.create({
  youTab: { paddingBottom: 24 },
  /* Everything the walk-through can cover, in one plain node: the flags that
     take it out of the accessibility tree go straight on the native view. */
  beneath: { flex: 1 },
  beneathHidden: { flex: 1, display: 'none' },
});
