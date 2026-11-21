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
import sanitizeHtml from 'sanitize-html';
export const app = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    const allowed = new Set([
      env.CLIENT_URL,
      process.env.CLIENT_ORIGIN || '',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
    ].filter(Boolean));
    let hostname = '';
    try {
      hostname = origin ? new URL(origin).hostname : '';
    } catch {
      hostname = '';
    }
    if (!origin || allowed.has(origin) || /\.vercel\.app$/.test(hostname)) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS'));
    }
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
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !key.startsWith('$') && !key.includes('.')).map(([key, val]) => [key, typeof val === 'string' ? sanitizeHtml(val, { allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u'], allowedAttributes: {} }) : sanitize(val)]));
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
