import { Clipboard as RNClipboard, Share } from 'react-native';

import type { Clipboard } from '../../application/ports/Clipboard';

/**
 * The platform clipboard and share sheet.
 *
 * `Clipboard` was pulled out of React Native core and now warns on every
 * call; it still works, and this app has no other clipboard need that would
 * justify a new native dependency for it.
 */
export const systemClipboard: Clipboard = {
  async copy(value) {
    RNClipboard.setString(value);
  },
  async paste() {
    try {
      return await RNClipboard.getString();
    } catch {
      return '';
    }
  },
  async share(message) {
    try {
      await Share.share({ message });
    } catch {
      // The system sheet was dismissed or unavailable; the link is already
      // on the screen and copyable, so there is nothing more to do here.
    }
  },
};
