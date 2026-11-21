import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
const key = () => {
  const raw = env.FIELD_ENC_KEY.replace(/-/g, '');
  return Buffer.from(raw.length === 64 ? raw : raw.padEnd(64, '0').slice(0, 64), 'hex');
};
export function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}
export function decrypt(payload: string): string {
  const [ivHex, tagHex, encryptedHex] = payload.split(':');
  if (!ivHex || !tagHex || !encryptedHex) throw new Error('Invalid encrypted value');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
}

