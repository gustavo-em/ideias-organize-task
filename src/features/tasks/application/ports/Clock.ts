/**
 * The current time, as a dependency.
 *
 * Every rule in this feature takes the moment it runs at as an argument, so
 * the domain never calls `Date.now` itself and every test can pin the day.
 */
export interface Clock {
  now(): number;
}
