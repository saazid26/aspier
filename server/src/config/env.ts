import 'dotenv/config';
import { createHash } from 'node:crypto';
import { z } from 'zod';

const devFallback = (name: 'access' | 'refresh' | 'field' | 'adminPass') =>
  createHash('sha256').update(`aspier-platform-secure-fallback-${name}-v1`).digest('hex');

export const DEFAULT_ADMIN_EMAIL = 'admin@gmail.com';
export const DEFAULT_ADMIN_PASSWORD = 'admin123';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  ADMIN_EMAIL: z.string().email().default(DEFAULT_ADMIN_EMAIL).transform((v) => v.trim().toLowerCase()),
  ADMIN_PASSWORD: z.string().min(6).optional().default(DEFAULT_ADMIN_PASSWORD),
  MONGO_URI: z.string().optional().default('').or(z.undefined()).transform((v) => v || process.env.MONGODB_URI || process.env.DATABASE_URL || ''),
  CLIENT_URL: z.string().url().default(
    process.env.NODE_ENV === 'production' || process.env.VERCEL
      ? 'https://aspierglobal.vercel.app'
      : (process.env.CLIENT_URL || 'https://aspierglobal.vercel.app')
  ).transform((val) => {
    if ((process.env.NODE_ENV === 'production' || process.env.VERCEL) && val.includes('localhost')) {
      return 'https://aspierglobal.vercel.app';
    }
    return val.replace(/\/$/, '');
  }),
  JWT_ACCESS_SECRET: z.string().min(32).optional().transform((v) => v || devFallback('access')),
  JWT_REFRESH_SECRET: z.string().min(32).optional().transform((v) => v || devFallback('refresh')),
  COOKIE_DOMAIN: z.string().optional().default(''),
  FIELD_ENC_KEY: z.string().optional().transform((v) => v || devFallback('field')),
  CLOUDINARY_URL: z.string().optional().default('cloudinary://519468336856738:OFdCbZUTHo21IPWV8bRtkw4T4ms@w9zgpjap'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default('w9zgpjap'),
  CLOUDINARY_API_KEY: z.string().optional().default('519468336856738'),
  CLOUDINARY_API_SECRET: z.string().optional().default('OFdCbZUTHo21IPWV8bRtkw4T4ms'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('ASPIER <no-reply@aspier.org>')
});
export const env = schema.parse(process.env);
export const FIXED_ADMIN_EMAIL = env.ADMIN_EMAIL;
