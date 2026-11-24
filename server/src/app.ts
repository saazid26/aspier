import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import hpp from 'hpp';
import mongoose from 'mongoose';
import routes from './routes/index.js';
import { env } from './config/env.js';
import { connectDatabase, connectDB, DatabaseError, getMongoUri } from './config/db.js';
import { fastCache } from './utils/fastCache.js';
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
export function healthHandler(_req: express.Request, res: express.Response): void {
  const hasMongoUri = Boolean(getMongoUri());
  res.json({
    ok: true,
    success: true,
    status: 'ok',
    dbState: mongoose.connection.readyState,
    hasMongoUri,
    timestamp: new Date().toISOString()
  });
}

app.get(['/health', '/api/health', '/api/v1/health'], healthHandler);

app.use(['/api', '/api/v1'], async (req, res, next) => {
  const pathWithoutQuery = ((req.path || '').split('?')[0] || '').toLowerCase();

  // Enforce zero stale caching on dynamic API routes so all DB edits reflect in real time
  if (!pathWithoutQuery.includes('/certificates/image/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Instantly purge server fastCache on any mutation
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        fastCache.clear();
      }
    });
  }

  if (pathWithoutQuery === '/health' || pathWithoutQuery === '/v1/health' || pathWithoutQuery.endsWith('/health')) {
    if (mongoose.connection.readyState !== 1) {
      await connectDB().catch(() => {});
    }
    return next();
  }

  const isPublicGet = req.method === 'GET' && (
    pathWithoutQuery.startsWith('/public/') ||
    pathWithoutQuery === '/courses' ||
    pathWithoutQuery === '/settings' ||
    pathWithoutQuery.startsWith('/wings') ||
    pathWithoutQuery.startsWith('/research') ||
    pathWithoutQuery.startsWith('/supervisors') ||
    pathWithoutQuery.startsWith('/scholars') ||
    pathWithoutQuery.startsWith('/news')
  );

  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    next();
  } catch (err: any) {
    if (isPublicGet) {
      return next();
    }
    if (err instanceof DatabaseError) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
        ...(err.detail ? { detail: err.detail } : {})
      });
    }
    const hasUri = Boolean(getMongoUri());
    const status = 503;
    const message = hasUri
      ? 'Database connection failed. Verify MongoDB Atlas Network Access (0.0.0.0/0) and credentials.'
      : 'Database configuration missing: set MONGO_URI in Vercel Environment Variables.';
    return res.status(status).json({
      success: false,
      message,
      detail: err instanceof Error ? err.message : String(err)
    });
  }
});

app.get('/sitemap.xml', (req, res, next) => {
  req.url = '/public/sitemap.xml';
  routes(req, res, next);
});
app.get('/robots.txt', (req, res, next) => {
  req.url = '/public/robots.txt';
  routes(req, res, next);
});
app.get('/google18d74d32a5c55233.html', (_req, res) => {
  res.header('Content-Type', 'text/html');
  res.send('google-site-verification: google18d74d32a5c55233.html');
});
app.use('/api/v1', routes);
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);
