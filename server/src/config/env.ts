import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

const devFallback = (name: 'access' | 'refresh' | 'field' | 'adminPass') =>
  randomBytes(32).toString('hex');

export const DEFAULT_ADMIN_EMAIL = 's2310956146@ru.ac.bd';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  ADMIN_EMAIL: z.string().email().default(DEFAULT_ADMIN_EMAIL).transform((v) => v.trim().toLowerCase()),
  ADMIN_PASSWORD: z.string().min(12).optional().default('zsELNP9WZdzc6ja'),
  MONGO_URI: z.string().optional().default(''),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(32).optional().transform((v) => v || devFallback('access')),
  JWT_REFRESH_SECRET: z.string().min(32).optional().transform((v) => v || devFallback('refresh')),
  COOKIE_DOMAIN: z.string().optional().default(''),
  FIELD_ENC_KEY: z.string().optional().transform((v) => v || devFallback('field')),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('ASPIER <no-reply@aspier.org>')
});
export const env = schema.parse(process.env);
export const FIXED_ADMIN_EMAIL = env.ADMIN_EMAIL;
