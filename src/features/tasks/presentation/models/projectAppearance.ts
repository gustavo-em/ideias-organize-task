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
