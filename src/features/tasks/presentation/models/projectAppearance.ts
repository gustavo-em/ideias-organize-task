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
