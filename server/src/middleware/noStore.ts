import type { Request, Response, NextFunction } from 'express';
export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  next();
}

