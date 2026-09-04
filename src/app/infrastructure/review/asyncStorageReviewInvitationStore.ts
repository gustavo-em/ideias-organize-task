import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ReviewInvitationStore } from '../../application/ports/ReviewInvitationStore';
import { sanitizeReviewInvitation } from '../../domain/ReviewInvitation';

const STORAGE_KEY = 'ideias.review-invitation.v1';

export const asyncStorageReviewInvitationStore: ReviewInvitationStore = {
  async load() {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored == null) return null;

    try {
      return sanitizeReviewInvitation(JSON.parse(stored));
    } catch {
      // A corrupted payload is discarded so the asking starts over rather than
      // never happening again.
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },
  async save(state) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
};
