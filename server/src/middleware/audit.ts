import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import { recordAudit } from '../services/audit.service.js';

export function audit(action: string, resource: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      const isSuccess = res.statusCode < 400;
      const resourceId = req.params?.id || req.body?.id || req.body?._id;
      const description = `${action.toUpperCase()} on ${resource}${resourceId ? ` (#${resourceId})` : ''} - Status: ${res.statusCode}`;

      void recordAudit({
        actor: req.user,
        action,
        description,
        resource,
        resourceId: resourceId ? String(resourceId) : undefined,
        route: `${req.method} ${req.originalUrl || req.baseUrl || req.path}`,
        status: isSuccess ? 'success' : 'failure',
        req,
        metadata: { method: req.method, status: res.statusCode }
      });
    });
    next();
  };
}
