import type { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import { verifyAccessToken } from '../services/token.service.js';
import { HttpError } from './error.js';
export interface AuthRequest extends Request { user?: any }
export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    const token = req.cookies?.accessToken || (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    if (!token) throw new HttpError(401, 'Authentication required');
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) throw new HttpError(401, 'Invalid or inactive account');
    const adminAccount = ['admin', 'superadmin'].includes(user.role);
    if (adminAccount ? user.isAdmin2FAEnabled : ['supervisor', 'youngScholar'].includes(user.role)) {
      if (adminAccount ? !user.isAdmin2FAEnabled : !user.twoFactorEnabled) throw new HttpError(401, 'Two-factor setup is required');
      if (user.twoFactorEnabledAt && payload.iat && payload.iat * 1000 < user.twoFactorEnabledAt.getTime()) {
        throw new HttpError(401, 'Administrator session predates two-factor verification');
      }
    }
    req.user = user;
    next();
  } catch (error) { next(error instanceof HttpError ? error : new HttpError(401, 'Authentication required')); }
}
export const authorize = (...roles: string[]) => (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'Insufficient permissions'));
  next();
};
