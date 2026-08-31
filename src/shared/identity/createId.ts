let sequence = 0;

/**
 * An identifier for something the person just created.
 *
 * It only has to be unique on this device: the time keeps entries ordered, the
 * counter separates two taps inside the same millisecond, and the random tail
 * keeps two devices from colliding once the same data is synced.
 */
export function createId(atMs: number): string {
  sequence = (sequence + 1) % 1296;

  return [
    atMs.toString(36),
    sequence.toString(36).padStart(2, '0'),
    Math.floor(Math.random() * 1679616)
      .toString(36)
      .padStart(4, '0'),
  ].join('-');
}
