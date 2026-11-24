import type { NextFunction, Request, Response } from 'express';
import { DatabaseError, getMongoUri } from '../config/db.js';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;

  if (error instanceof DatabaseError) {
    res.status(error.status).json({
      success: false,
      message: error.message,
      ...(error.detail ? { detail: error.detail } : {})
    });
    return;
  }

  const status = error instanceof HttpError ? error.status : 500;
  let message = error instanceof Error && error.message ? error.message : (typeof error === 'string' ? error : 'Request failed');

  if (
    message.includes('buffering timed out') ||
    message.includes('bufferCommands is false') ||
    message.includes('Database service is connecting')
  ) {
    const hasUri = Boolean(getMongoUri());
    const errStatus = 503;
    const resolvedMessage = hasUri
      ? 'Database connection failed. Verify MongoDB Atlas Network Access (0.0.0.0/0) and credentials.'
      : 'Database configuration missing: set MONGO_URI in Vercel Environment Variables.';
    const detail = error instanceof Error ? error.message : undefined;
    console.error('[errorHandler] Database connection fault:', errStatus, resolvedMessage, error);
    res.status(errStatus).json({
      success: false,
      message: resolvedMessage,
      ...(detail ? { detail } : {})
    });
    return;
  }

  console.error('[errorHandler]', status, message, error);
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && error instanceof Error ? { stack: error.stack } : {})
  });
}
