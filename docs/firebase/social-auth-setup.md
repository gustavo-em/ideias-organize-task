# Social sign-in setup (Google, Apple, anonymous)

The app code for all three providers ships in `src/features/auth`. What follows are the
steps only the project owner can perform, because they need the Firebase Console, the
Apple Developer account, or Xcode signed in with the owner's team.

## Firebase Console (required for all platforms)

Authentication → Sign-in method, enable:

- **Google** — already has an OAuth web client
  (`676891253849-kcdo2clkkemlom6vmpeju1ng5qtnsnq4.apps.googleusercontent.com`, the
  `client_type: 3` entry of `android/app/google-services.json`). That id is mirrored in
  `src/features/auth/infrastructure/firebase/googleAuthConfig.ts`; if the project ever
  gets a new web client, update both.
- **Apple** — needs a Services ID, a Key ID, and a private key created in the Apple
  Developer portal, pasted into the provider's configuration.
- **Anonymous** — no configuration beyond the switch.

Until a provider is enabled, Firebase answers `auth/operation-not-allowed`, which the app
already shows as "Esta forma de entrar está indisponível agora." instead of crashing.

## Android

Nothing manual beyond the console. `google-services.json` already covers
`com.ideiasorganizetask`, and the SHA-1/SHA-256 of the signing keys used for release
builds must be registered in the Firebase project settings for Google sign-in to
complete on a signed build.

A native rebuild is required after this change: `npm run android` (a Metro reload is not
enough for new native modules).

## iOS

1. Download `GoogleService-Info.plist` from the Firebase Console (iOS app) and add it to
   the Xcode project — the repository does not have one yet.
2. Copy the `REVERSED_CLIENT_ID` value from that file and add it to
   `ios/IdeiasOrganizeTask/Info.plist`:

   ```xml
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleURLSchemes</key>
       <array>
         <string>com.googleusercontent.apps.REPLACE-WITH-REVERSED-CLIENT-ID</string>
       </array>
     </dict>
   </array>
   ```

3. In Xcode, Signing & Capabilities → add **Sign in with Apple**, and point the target's
   `CODE_SIGN_ENTITLEMENTS` at `IdeiasOrganizeTask/IdeiasOrganizeTask.entitlements`
   (already in the repository).
4. `cd ios && bundle exec pod install`.

The iOS build of Google and Apple sign-in is written but was not run on a simulator in
this pass: it needs manual verification once the two files above exist.
