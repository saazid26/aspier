import type { NextFunction, Request, Response } from 'express';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function notFound(req: Request, res: Response): void { res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` }); }
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const status = error instanceof HttpError ? error.status : 500;
  const message = status === 500 ? 'Internal server error' : error instanceof Error ? error.message : 'Request failed';
  res.status(status).json({ success: false, message, ...(process.env.NODE_ENV === 'development' && error instanceof Error ? { stack: error.stack } : {}) });
}
