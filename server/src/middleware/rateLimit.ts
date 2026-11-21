import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
export const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: 'draft-7', legacyHeaders: false });
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
export const paymentLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
export const forgotLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false });
export const slowAuth = slowDown({ windowMs: 15 * 60 * 1000, delayAfter: 5, delayMs: () => 250 });

