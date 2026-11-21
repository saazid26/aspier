import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import AuditLog from '../models/AuditLog.js';
export function audit(action: string, resource: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        void AuditLog.create({ actorId: req.user?._id, action, resource, resourceId: req.params.id, ip: req.ip, userAgent: req.headers['user-agent'], metadata: { method: req.method, status: res.statusCode } });
      }
    });
    next();
  };
}

