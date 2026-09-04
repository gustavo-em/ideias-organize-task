import { Linking, NativeModules, Platform } from 'react-native';

import type { AppReviewPrompter } from '../../application/ports/AppReviewPrompter';

interface NativeAppReview {
  requestReview(): Promise<boolean>;
}

/** Where Play sends somebody who wants to write a review. The `market:` scheme
 * opens the installed store app; the web address is what a device without it
 * can still show. */
const PLAY_ID = 'com.ideiasorganizetask';
const PLAY_APP_URL = `market://details?id=${PLAY_ID}`;
const PLAY_WEB_URL = `https://play.google.com/store/apps/details?id=${PLAY_ID}`;

function nativeModule(): NativeAppReview | null {
  const module = (NativeModules as Record<string, unknown>).AluzaAppReview;

  return (module as NativeAppReview | undefined) ?? null;
}

/**
 * The two stores, and the two different things they allow.
 *
 * On iOS the App Store's rules require `SKStoreReviewController` — the system
 * decides whether the prompt appears at all, and a link to the store page in
 * its place is grounds for rejection. On Android there is no such rule and no
 * such module in this build, so the store page is opened directly, which is
 * the honest version of the same offer.
 */
export const systemAppReviewPrompter: AppReviewPrompter = {
  async requestReview() {
    if (Platform.OS === 'ios') {
      const module = nativeModule();
      if (module == null) return false;

      try {
        return await module.requestReview();
      } catch {
        return false;
      }
    }

    if (Platform.OS !== 'android') return false;

    try {
      await Linking.openURL(PLAY_APP_URL);
      return true;
    } catch {
      // No Play app installed, or the app is not on the store yet.
      try {
        await Linking.openURL(PLAY_WEB_URL);
        return true;
      } catch {
        return false;
      }
    }
  },
};
