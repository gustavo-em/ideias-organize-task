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

  constructor(kind: ShareErrorKind) {
    super(`share error: ${kind}`);
    this.kind = kind;
  }
}
