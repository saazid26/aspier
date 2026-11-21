import type { Response, CookieOptions } from 'express';
import { env } from '../config/env.js';
const secure = env.NODE_ENV === 'production';
const base: CookieOptions = { httpOnly: true, secure, sameSite: 'lax', domain: env.COOKIE_DOMAIN || undefined, path: '/' };
export function setAuthCookies(res: Response, access: string, refresh: string): void {
  res.cookie('accessToken', access, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refresh, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
}
export function setCsrfCookie(res: Response, token: string): void {
  res.cookie('csrfToken', token, { httpOnly: false, secure, sameSite: 'lax', domain: env.COOKIE_DOMAIN || undefined, path: '/', maxAge: 24 * 60 * 60 * 1000 });
}
export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', base);
  res.clearCookie('refreshToken', base);
  res.clearCookie('csrfToken', { ...base, httpOnly: false });
}

