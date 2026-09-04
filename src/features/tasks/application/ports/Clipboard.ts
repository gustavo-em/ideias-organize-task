/** What the copy-link and invite controls need from the platform. */
export interface Clipboard {
  copy(value: string): Promise<void>;
  /** Opens the system share sheet with the whole invite message — link
   * included, in the place the message puts it. */
  share(message: string): Promise<void>;
  /** What is currently on the clipboard, for "Colar" on the join sheet. */
  paste(): Promise<string>;
}
