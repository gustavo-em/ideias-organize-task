# App Check setup (Play Integrity, App Attest, debug tokens)

The app code ships in `src/shared/firebase/appCheck.ts`, booted from `index.js` before the
first render. What follows are the steps only the project owner can perform, because they
need the Firebase Console, the Play Console, the Apple Developer portal, or a device.

Nothing is enforced until you turn the switch in the console (last section). Until then
every call carries the proof when it can, the console counts how many arrive verified, and
a call without proof still works — which is the point of shipping this first and enforcing
later.

## What is protected, and how

- **Auth, Messaging, Analytics, Crashlytics** — native Firebase SDKs; they attach the App
  Check token by themselves once `initializeAppCheck` ran.
- **Firestore** — the app talks to it over REST (`firestoreRest.ts`), not through an SDK, so
  every request adds the `X-Firebase-AppCheck` header itself via `appCheckHeaders()`. A
  request that cannot get a token goes out without the header; the server decides.
- **Cloud Function `invite`** (the link preview page) — deliberately **not** protected: it
  is served to browsers of people who do not have the app yet. Do not enable enforcement
  for it.

Providers per build type (`__DEV__`):

| Build   | Android                        | iOS                                                  |
| ------- | ------------------------------ | ---------------------------------------------------- |
| debug   | `debug` provider (debug token) | `debug` provider (debug token)                       |
| release | Play Integrity                 | App Attest, falling back to DeviceCheck below iOS 14 |

## Firebase Console — register the apps

App Check → Apps.

### Android (`com.ideiasorganizetask`) → Play Integrity

Register with the **SHA-256** fingerprints of every certificate that signs a build people
run. The App Check page uses SHA-256, not the SHA-1 the Auth page uses.

| Certificate                                                 | SHA-256                                                                                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `android/app/debug.keystore` (dev builds)                   | `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`                                                                                     |
| `aluza-release.keystore` (upload key, local release builds) | `31:14:C9:62:D2:51:49:4C:89:D5:BF:F9:5A:30:25:80:98:52:54:AA:20:1E:FA:81:28:1B:5F:48:DA:CA:81:DB`                                                                                     |
| Play App Signing key (what people install from the store)   | Play Console → Setup → App signing → "App signing key certificate". It is most likely the third fingerprint already listed in `public/.well-known/assetlinks.json` (`1F:8A:72:1A:…`). |

Play Integrity also needs the app linked to the Cloud project: Play Console → Setup → App
integrity → **Link Cloud project** → choose `ideiasorganizetask`. The app already has a
closed-testing release, which is all Play requires.

Note: a release APK installed by hand (not through Play) is not "Play recognised", so Play
Integrity refuses it and the app runs without proof. That is fine while unenforced; after
enforcement, test release builds through the internal testing track, or register that
device's debug token (below) on a debug build instead.

### Apple (`com.aluza.app`) → App Attest

- Team ID `ZVV2WA9432`.
- App Attest needs the **App Attest** capability on the App ID (Apple Developer portal →
  Identifiers → the App ID → Capabilities). The entitlement is already in
  `ios/IdeiasOrganizeTask/IdeiasOrganizeTask.entitlements`
  (`com.apple.developer.devicecheck.appattest-environment = production`); with automatic
  signing, Xcode picks it up once the capability exists on the App ID.
- For the DeviceCheck fallback, App Check asks for a **DeviceCheck private key**: Apple
  Developer portal → Keys → new key with DeviceCheck enabled → download the `.p8` once;
  paste the key, its Key ID and the Team ID into the console.

## Debug tokens (development builds, simulators, emulators)

A debug build uses the debug provider. On first launch the native SDK prints a token:

- Android: `adb logcat | grep -i "DebugAppCheckProvider"` — the line reads "Enter this
  debug secret into the allow list in the Firebase Console…".
- iOS: the Xcode console prints `Firebase App Check Debug Token: …`.

Firebase Console → App Check → Apps → the app → ⋮ → **Manage debug tokens** → add it with
a name (device or person). One token per installation; a reinstall makes a new one.
Never ship a debug token inside a release build.

## Turning enforcement on (after 1–2 weeks of metrics)

App Check → APIs shows, per service, how many requests arrive verified, unverified-outdated
client, or unverified-unknown origin. Enforce only when the verified share is what you
expect from the store builds; the remainder is exactly what enforcement will refuse.

1. **Cloud Firestore** — first. This is where the abuse surface is (public API key +
   anonymous sessions).
2. **Authentication** — second, once the console confirms it is available for this
   project (it may require upgrading to Firebase Authentication with Identity Platform;
   the free tier covers this app's scale).
3. Leave **Cloud Functions** unenforced: the `invite` page is for people without the app.

Rollback is the same switch: turning enforcement off restores the previous behaviour
immediately, without a new build.
