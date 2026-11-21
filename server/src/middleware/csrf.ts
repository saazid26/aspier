import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { setCsrfCookie } from '../utils/cookies.js';
import { HttpError } from './error.js';
export function csrfToken(req: Request, res: Response): void {
  const existing = req.cookies?.csrfToken as string | undefined;
  const token = existing || randomBytes(32).toString('hex');
  setCsrfCookie(res, token);
  res.json({ success: true, data: { csrfToken: token } });
}
export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (env.NODE_ENV === 'test' && !req.headers['x-enforce-csrf']) return next();
  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) return next(new HttpError(403, 'CSRF validation failed'));
  next();
}

