import bcrypt from 'bcryptjs';
export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string): Promise<boolean> => bcrypt.compare(password, hash);
export function passwordStrength(password: string): string[] {
  const errors: string[] = [];
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
  if (password && password.length > 128) errors.push('Password must not exceed 128 characters');
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) errors.push('Use a mix of letters and numbers');
  if (password.toLowerCase().includes('password') || password.includes('123456')) errors.push('Password is too common');
  return errors;
}
export async function breachedPasswordCheck(_password: string): Promise<boolean> { return false; }
