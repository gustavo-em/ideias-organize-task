import type { Clock } from '../../application/ports/Clock';

export const systemClock: Clock = {
  now: () => Date.now(),
};
