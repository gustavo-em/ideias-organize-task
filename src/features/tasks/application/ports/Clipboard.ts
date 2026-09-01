/** What the copy-link and invite controls need from the platform. */
export interface Clipboard {
  copy(value: string): Promise<void>;
  /** Opens the system share sheet with a message and a link in it. */
  share(value: string, message: string): Promise<void>;
  /** What is currently on the clipboard, for "Colar" on the join sheet. */
  paste(): Promise<string>;
}
