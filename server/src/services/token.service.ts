import jwt, { type JwtPayload } from 'jsonwebtoken';
import { randomUUID, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { sha256 } from '../utils/crypto.js';
export type AccessPayload = JwtPayload & { sub: string; role: string };
export function signAccessToken(user: { _id: unknown; role: string }): string {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, { subject: String(user._id), expiresIn: '15m' });
}
export function verifyAccessToken(token: string): AccessPayload { return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload; }
export function signRefreshToken(userId: string, familyId: string): string {
  return jwt.sign({ familyId, nonce: randomBytes(16).toString('hex') }, env.JWT_REFRESH_SECRET, { subject: userId, expiresIn: '7d' });
}
export async function issueRefreshSession(userId: string, info: { device?: string; ip?: string }, familyId: string = randomUUID()) {
  const token = signRefreshToken(userId, familyId);
  const hash = sha256(token);
  await User.updateOne({ _id: userId }, { $push: { refreshTokens: { refreshTokenHash: hash, device: info.device, ip: info.ip, familyId, createdAt: new Date(), expiresAt: new Date(Date.now() + 7 * 86400000) } } });
  return token;
}
export async function rotateRefreshToken(token: string, info: { device?: string; ip?: string }) {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload & { familyId: string };
  if (!payload.sub || !payload.familyId) throw new Error('Invalid refresh token');
  const hash = sha256(token);
  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user) throw new Error('Session not found');
  const sessions = (user as any).refreshTokens as Array<{ refreshTokenHash: string; familyId?: string; revokedAt?: Date }>;
  const session = sessions.find((s) => s.refreshTokenHash === hash);
  if (!session) {
    await User.updateOne({ _id: user._id }, { $set: { 'refreshTokens.$[].revokedAt': new Date() } });
    throw new Error('Refresh token reuse detected');
  }
  if (session.revokedAt) {
    await User.updateOne({ _id: user._id }, { $set: { 'refreshTokens.$[].revokedAt': new Date() } });
    throw new Error('Refresh token reuse detected');
  }
  await User.updateOne({ _id: user._id, 'refreshTokens.refreshTokenHash': hash }, { $set: { 'refreshTokens.$.revokedAt': new Date() } });
  const next = await issueRefreshSession(payload.sub, info, payload.familyId);
  return { refreshToken: next, user };
}
