/**
 * @format
 */

import { AppRegistry } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';

import App from './App';
import { name as appName } from './app.json';
import { activitySyncHeadlessTask } from './src/features/tasks/infrastructure/notifications/backgroundActivitySync';
import { configureAppCheck } from './src/shared/firebase/appCheck';

// Before the first render and before any Firebase call: the proof that a call
// came from this app has to exist before the calls do. Nothing in the import
// graph above touches Firebase at module load, so this is early enough.
configureAppCheck();

AppRegistry.registerComponent(appName, () => App);

// Layer A+: what Android starts when the scheduled check comes due and the app
// is not running. It has to be registered next to the component itself, before
// anything mounts.
BackgroundFetch.registerHeadlessTask(activitySyncHeadlessTask);
