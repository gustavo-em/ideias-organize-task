/**
 * What can go wrong while a project talks to the group, named by what the
 * sheet needs to say — never by a provider status code.
 */
export type ShareErrorKind =
  | 'network'
  | 'invalid-invite'
  | 'forbidden'
  | 'unknown';

export interface ShareError {
  kind: ShareErrorKind;
}

/** What a `ShareGateway` method rejects with. */
export class ShareOperationError extends Error implements ShareError {
  kind: ShareErrorKind;
  /** Where the refusal came from, in one short token — shown under the error
   * on screen. "invalid-invite" alone cannot tell a link that was mistyped
   * from a document the server would not hand over, and the two need
   * opposite answers from whoever is holding the phone. */
  detail?: string;

  constructor(kind: ShareErrorKind, detail?: string) {
    super(
      detail == null
        ? `share error: ${kind}`
        : `share error: ${kind} (${detail})`,
    );
    this.kind = kind;
    this.detail = detail;
  }
}
