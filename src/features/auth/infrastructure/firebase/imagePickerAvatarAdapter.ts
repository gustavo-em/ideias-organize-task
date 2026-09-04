import { launchImageLibrary } from 'react-native-image-picker';

import type { AvatarPort } from '../../application/ports/AvatarPort';
import { AvatarOperationError } from '../../domain/AvatarError';

/** The longest side the photo is allowed to have once it leaves the gallery.
 * The picker itself does the resizing, on the native side, so a 10MB photo
 * never reaches the profile document. */
const MAX_SIDE = 288;

/**
 * Plano B de armazenamento: a foto vive DENTRO do documento de perfil no
 * Firestore, como data URI — nenhum bucket, nenhum plano pago. A 288px e
 * qualidade 0.7 um avatar fica em ~20-60KB de base64, folgado dentro do limite
 * de 1MB do documento e do teto imposto pela regra de segurança. `Image`
 * carrega data URIs nativamente, então todo lugar que mostra a foto continua
 * igual. Migrar para o Storage um dia é trocar só este adaptador.
 */
export const imagePickerAvatarAdapter: AvatarPort = {
  async pickAndUpload(_uid) {
    const answer = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      maxWidth: MAX_SIDE,
      maxHeight: MAX_SIDE,
      quality: 0.7,
      includeBase64: true,
    });

    // Backing out of the gallery is not an error and says nothing on screen.
    if (answer.didCancel === true) return null;
    if (answer.errorCode != null) {
      throw new AvatarOperationError(
        answer.errorCode === 'permission' ? 'forbidden' : 'network',
      );
    }

    const asset = answer.assets?.[0];
    const base64 = asset?.base64 ?? null;
    if (base64 == null) return null;

    return `data:${asset?.type ?? 'image/jpeg'};base64,${base64}`;
  },

  // Nada remoto para apagar: a foto mora no documento, e é o view-model que
  // limpa o campo logo em seguida.
  async remove(_uid) {},
};
