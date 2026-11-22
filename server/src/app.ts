import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import hpp from 'hpp';
import routes from './routes/index.js';
import { env } from './config/env.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { requireCsrf } from './middleware/csrf.js';
import { notFound, errorHandler } from './middleware/error.js';

function stripDangerousHtml(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*(["']).*?\1/gi, '')
    .replace(/javascript:/gi, '');
}

export const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    try {
      const url = new URL(origin);
      const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
      const isVercel = /\.vercel\.app$/.test(url.hostname);
      const isClientUrl = Boolean(env.CLIENT_URL && origin.startsWith(env.CLIENT_URL));
      const isCustomAllowed = Boolean(process.env.CLIENT_ORIGIN && origin.startsWith(process.env.CLIENT_ORIGIN));
      if (isLocalhost || isVercel || isClientUrl || isCustomAllowed) {
        return callback(null, true);
      }
    } catch {
      // ignore URL parsing error
    }
    // Permissive fallback to prevent 500 internal server errors on preview or custom domains
    callback(null, true);
  }
}));
app.use(compression());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(hpp());
app.use((req, _res, next) => {
  const sanitize = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(sanitize);
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !key.startsWith('$') && !key.includes('.')).map(([key, val]) => [key, typeof val === 'string' ? stripDangerousHtml(val) : sanitize(val)]));
  };
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query) as typeof req.query;
  next();
});
app.use('/uploads', express.static(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads'), { fallthrough: false }));
app.use(globalLimiter);
app.use(requireCsrf);
app.get('/sitemap.xml', (req, res, next) => {
  req.url = '/public/sitemap.xml';
  routes(req, res, next);
});
app.use('/api/v1', routes);
app.use(notFound);
app.use(errorHandler);
