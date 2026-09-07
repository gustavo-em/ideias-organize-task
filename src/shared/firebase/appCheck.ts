import { getApp } from '@react-native-firebase/app';
import {
  getToken,
  initializeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
  type AppCheck,
} from '@react-native-firebase/app-check';

/**
 * App Check: proof that a call came from this app, signed by this app's
 * certificate, and not from a script holding the same public API key.
 *
 * The Firebase SDKs (Auth, Messaging, Analytics) attach the proof by
 * themselves once this is configured. The sharing gateway does not go through
 * an SDK — it speaks to Firestore over REST — so it asks {@link appCheckHeaders}
 * for the same proof on every request.
 *
 * Nothing here is enforced by this file: the console decides, per service,
 * whether a call without valid proof is refused. Until that switch is turned
 * the header is only counted, which is what makes it safe to ship first and
 * enforce later, once the console shows the real traffic arriving verified.
 */

const HEADER = 'X-Firebase-AppCheck';

let instance: AppCheck | null = null;

/**
 * Called once, before anything else touches Firebase — from `index.js`, ahead
 * of the first render. Never throws: an app that cannot prove itself still
 * works exactly as it did before App Check existed, and the console shows the
 * gap.
 *
 * A development build uses the debug provider: on first launch the native
 * SDK prints a debug token to logcat / the Xcode console, which is registered
 * once per device in Firebase Console → App Check → Apps → Manage debug
 * tokens. Release builds attest with Play Integrity and App Attest (falling
 * back to DeviceCheck on iOS below 14). See `docs/firebase/app-check.md`.
 */
export function configureAppCheck(): void {
  try {
    const provider = new ReactNativeFirebaseAppCheckProvider();

    provider.configure({
      android: { provider: __DEV__ ? 'debug' : 'playIntegrity' },
      apple: {
        provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
      },
    });

    instance = initializeAppCheck(getApp(), {
      provider,
      isTokenAutoRefreshEnabled: true,
    });

    // The first token is the slow one (an attestation round-trip); asking for
    // it now means the first Firestore call does not pay for it.
    getToken(instance).catch(() => undefined);
  } catch (error) {
    instance = null;
    console.warn('[app-check] not configured', error);
  }
}

/**
 * The proof, as a request header — or nothing.
 *
 * `{}` covers every way the proof can be missing: App Check not configured in
 * this build, an attestation the device cannot produce (no Play Services, a
 * sideloaded release build Play does not recognise), or the native side still
 * warming up. The request goes out either way; whether it is accepted is the
 * server's decision, not this file's.
 */
export async function appCheckHeaders(): Promise<Record<string, string>> {
  if (instance == null) return {};

  try {
    const { token } = await getToken(instance);

    return token.length > 0 ? { [HEADER]: token } : {};
  } catch {
    return {};
  }
}
