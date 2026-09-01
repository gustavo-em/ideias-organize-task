/**
 * The OAuth *web* client id of this Firebase project — the `client_type: 3`
 * entry of `android/app/google-services.json`. Firebase needs this one, not
 * the Android client id, to trade a Google id token for a session.
 *
 * It is a public identifier, not a secret: it ships inside the app binary on
 * every platform. Kept here rather than read from the JSON at runtime because
 * the native config file is not part of the JS bundle.
 */
export const GOOGLE_WEB_CLIENT_ID =
  '676891253849-kcdo2clkkemlom6vmpeju1ng5qtnsnq4.apps.googleusercontent.com';
