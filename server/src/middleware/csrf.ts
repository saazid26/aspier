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

export function isCsrfExempt(req: Request): boolean {
  const rawPath = req.path || req.originalUrl || req.url || '';
  const cleanPath = (rawPath.split('?')[0] ?? '').toLowerCase();

  // Exempt pre-login, registration, password recovery and token refresh
  if (
    cleanPath.endsWith('/auth/login') ||
    cleanPath.endsWith('/auth/register') ||
    cleanPath.endsWith('/auth/forgot-password') ||
    cleanPath.endsWith('/auth/reset-password') ||
    cleanPath.endsWith('/auth/refresh') ||
    cleanPath.includes('/auth/admin-2fa') ||
    cleanPath.includes('/auth/webauthn/login')
  ) {
    return true;
  }

  // Exempt public applications, inquiries, contact form and membership signup/lookup/recovery endpoints
  if (
    cleanPath.includes('/membership/') ||
    cleanPath.includes('/research-applications') ||
    cleanPath.includes('/onboarding') ||
    cleanPath.includes('/inquiries') ||
    cleanPath.includes('/contact') ||
    cleanPath.includes('/join') ||
    cleanPath.includes('/applications')
  ) {
    return true;
  }

  return false;
}

export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const enforceInTest = Boolean(req.headers['x-enforce-csrf']);
  if (env.NODE_ENV === 'test' && !enforceInTest) return next();
  if (!enforceInTest && isCsrfExempt(req)) return next();

  // Requests authenticated with explicit Bearer tokens are safe from browser cross-site CSRF attacks
  const authHeader = req.headers.authorization;
  if (!enforceInTest && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) return next(new HttpError(403, 'CSRF validation failed'));
  next();
}

