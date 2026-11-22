import type { NextFunction, Request, Response } from 'express';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function notFound(req: Request, res: Response): void { res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` }); }
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;
  const status = error instanceof HttpError ? error.status : 500;
  let message = error instanceof Error && error.message ? error.message : (typeof error === 'string' ? error : 'Request failed');
  if (message.includes('buffering timed out') || message.includes('bufferCommands is false')) {
    message = 'Database service is connecting. Please retry in a moment.';
  }
  console.error('[errorHandler]', status, message, error);
  res.status(status).json({ success: false, message, ...(process.env.NODE_ENV === 'development' && error instanceof Error ? { stack: error.stack } : {}) });
}
