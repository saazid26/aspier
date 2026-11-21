import bcrypt from 'bcryptjs';
export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string): Promise<boolean> => bcrypt.compare(password, hash);
export function passwordStrength(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) errors.push('Use upper, lower, and numeric characters');
  if (password.includes('password') || password.includes('123456')) errors.push('Password is too common');
  return errors;
}
export async function breachedPasswordCheck(_password: string): Promise<boolean> { return false; }
