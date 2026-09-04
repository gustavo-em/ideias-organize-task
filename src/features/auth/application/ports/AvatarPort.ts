/**
 * Where the profile photo comes from and where it lives.
 *
 * The whole gallery-and-bucket side of the feature sits behind these two
 * calls, so the view model never knows about pickers or buckets and the suite
 * can answer them without a device.
 */
export interface AvatarPort {
  /** Opens the gallery, resizes what was chosen and stores it. Resolves null
   * when the person backed out without choosing anything. Rejects with
   * `AvatarOperationError` when the photo could not be stored. */
  pickAndUpload(uid: string): Promise<string | null>;
  /** Takes the stored photo out of the bucket. */
  remove(uid: string): Promise<void>;
}
