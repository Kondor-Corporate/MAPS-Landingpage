/** Espeja la política del backend (`backend/src/lib/passwordPolicy.ts`, MAPS-016). */
export const PASSWORD_MIN_LENGTH = 8;

export function passwordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`;
  if (!/[A-Z]/.test(password)) return 'Requiere al menos una mayúscula';
  if (!/[a-z]/.test(password)) return 'Requiere al menos una minúscula';
  if (!/[0-9]/.test(password)) return 'Requiere al menos un número';
  return null;
}
