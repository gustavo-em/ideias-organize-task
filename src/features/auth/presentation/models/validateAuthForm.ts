import type { AuthCopy } from '../localization/authCopy';

export const MIN_PASSWORD_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string, copy: AuthCopy): string | null {
  if (email.trim().length === 0) return copy.fieldErrors.emailRequired;
  if (!EMAIL_PATTERN.test(email.trim())) return copy.fieldErrors.emailInvalid;

  return null;
}

export function validateRequiredPassword(
  password: string,
  copy: AuthCopy,
): string | null {
  if (password.length === 0) return copy.fieldErrors.passwordRequired;

  return null;
}

export function validateNewPassword(
  password: string,
  copy: AuthCopy,
): string | null {
  if (password.length === 0) return copy.fieldErrors.passwordRequired;
  if (password.length < MIN_PASSWORD_LENGTH)
    return copy.fieldErrors.passwordTooShort;

  return null;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
  copy: AuthCopy,
): string | null {
  if (confirmPassword !== password)
    return copy.fieldErrors.confirmPasswordMismatch;

  return null;
}
