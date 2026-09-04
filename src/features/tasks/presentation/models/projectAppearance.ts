import type { AppTheme } from '../../../../app/theme/theme';
import type { ListColor } from '../../domain/TaskList';

/** Project colours are identity accents, not status colours. */
export function projectTone(theme: AppTheme, color: ListColor): string {
  return {
    sun: theme.colors.accent,
    grape: theme.colors.focusInk,
    mint: theme.colors.success,
    coral: theme.colors.projectCoral,
    ocean: theme.colors.projectOcean,
  }[color];
}

/**
 * The same accent as a ground instead of as ink. The value is the token
 * itself with an alpha suffix, so no colour is invented here: dark mode needs
 * a little more of it for the wash to be seen over a near-black card.
 */
export function projectTint(theme: AppTheme, color: ListColor): string {
  return `${projectTone(theme, color)}${theme.mode === 'dark' ? '33' : '1F'}`;
}

/**
 * What is written on top of that wash.
 *
 * Never the pure colour: at 12% of itself as a ground, Coral reads 3.7:1 and
 * Sol barely 3.3:1, and both fail AA at the caption size a group's date and
 * count are set in. The theme already keeps this pair for `accent` and for
 * `success`; a project colour needs the same one before it can carry text.
 */
export function projectInk(theme: AppTheme, color: ListColor): string {
  return {
    sun: theme.colors.projectSunInk,
    grape: theme.colors.projectGrapeInk,
    mint: theme.colors.projectMintInk,
    coral: theme.colors.projectCoralInk,
    ocean: theme.colors.projectOceanInk,
  }[color];
}

/**
 * The symbol drawn on a square filled with the pure colour.
 *
 * Paper on ink everywhere except the yellow, where paper would vanish: there
 * it takes the ink the accent already carries.
 */
export function projectBadgeInk(theme: AppTheme, color: ListColor): string {
  return color === 'sun' ? theme.colors.onAccent : theme.colors.card;
}
