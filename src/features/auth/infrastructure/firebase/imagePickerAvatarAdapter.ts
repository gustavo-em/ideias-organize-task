import { launchImageLibrary } from 'react-native-image-picker';

import type { AvatarPort } from '../../application/ports/AvatarPort';
import { AvatarOperationError } from '../../domain/AvatarError';
import { deleteAvatar, uploadAvatar } from './firebaseStorageRest';

/** The longest side the photo is allowed to have once it leaves the gallery.
 * The picker itself does the resizing, on the native side, so a 10MB photo
 * never reaches the network. */
const MAX_SIDE = 512;

export const imagePickerAvatarAdapter: AvatarPort = {
  async pickAndUpload(uid) {
    const answer = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      maxWidth: MAX_SIDE,
      maxHeight: MAX_SIDE,
      quality: 0.8,
      includeBase64: false,
    });

    // Backing out of the gallery is not an error and says nothing on screen.
    if (answer.didCancel === true) return null;
    if (answer.errorCode != null) {
      throw new AvatarOperationError(
        answer.errorCode === 'permission' ? 'forbidden' : 'network',
      );
    }

    const uri = answer.assets?.[0]?.uri ?? null;
    if (uri == null) return null;

    return uploadAvatar(uid, uri);
  },

  async remove(uid) {
    await deleteAvatar(uid);
  },
};
