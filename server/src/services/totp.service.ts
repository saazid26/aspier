import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { encrypt, decrypt } from '../utils/crypto.js';
authenticator.options = { digits: 6, step: 30, window: 1 };
export async function createTotpSecret(accountName: string) {
  const secret = authenticator.generateSecret();
  return { secret, qrDataUrl: await createTotpQr(accountName, secret), secretEncrypted: encrypt(secret) };
}
export function createTotpQr(accountName: string, secret: string): Promise<string> {
  return QRCode.toDataURL(authenticator.keyuri(accountName, 'ASPIER', secret));
}
export function verifyTotp(code: string, secretEncrypted: string): boolean { return authenticator.check(code, decrypt(secretEncrypted)); }
