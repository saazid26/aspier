import type { Response, CookieOptions } from 'express';
import { env } from '../config/env.js';

const isProductionOrVercel = env.NODE_ENV === 'production' || process.env.VERCEL === '1';

export function getCookieOptions(): CookieOptions {
  const isLocal = env.NODE_ENV !== 'production' && process.env.VERCEL !== '1';
  const cookieDomain = (env.COOKIE_DOMAIN && !isLocal && !['localhost', '127.0.0.1'].includes(env.COOKIE_DOMAIN))
    ? env.COOKIE_DOMAIN
    : undefined;

  return {
    httpOnly: true,
    secure: isProductionOrVercel && !isLocal,
    sameSite: 'lax',
    domain: cookieDomain,
    path: '/'
  };
}

export function setAuthCookies(res: Response, access: string, refresh: string): void {
  const base = getCookieOptions();
  res.cookie('accessToken', access, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refresh, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function setCsrfCookie(res: Response, token: string): void {
  const base = getCookieOptions();
  res.cookie('csrfToken', token, { ...base, httpOnly: false, maxAge: 24 * 60 * 60 * 1000 });
}

export function clearAuthCookies(res: Response): void {
  const base = getCookieOptions();
  res.clearCookie('accessToken', base);
  res.clearCookie('refreshToken', base);
  res.clearCookie('csrfToken', { ...base, httpOnly: false });
}

