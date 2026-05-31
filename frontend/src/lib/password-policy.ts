export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MIN_DIGITS = 1;
export const PASSWORD_MIN_SPECIAL = 1;

export function countPasswordDigits(password: string): number {
  return (password.match(/\d/g) ?? []).length;
}

export function countPasswordSpecialChars(password: string): number {
  return (password.match(/[^a-zA-Z0-9]/g) ?? []).length;
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (countPasswordDigits(password) < PASSWORD_MIN_DIGITS) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_DIGITS} chiffre.`;
  }
  if (countPasswordSpecialChars(password) < PASSWORD_MIN_SPECIAL) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_SPECIAL} caractère spécial (ex. ! ? @ #).`;
  }
  return null;
}

export function passwordRequirementHint(): string {
  return `Au moins ${PASSWORD_MIN_LENGTH} caractères, dont ${PASSWORD_MIN_DIGITS} chiffre et ${PASSWORD_MIN_SPECIAL} caractère spécial.`;
}
