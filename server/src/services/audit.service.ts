import AuditLog from '../models/AuditLog.js';
import { extractClientIp, parseUserAgent } from '../utils/device.js';

export interface AuditEntryOptions {
  actor?: {
    _id?: any;
    id?: any;
    name?: string;
    email?: string;
    role?: string;
  } | null;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  description?: string;
  resource: string;
  resourceId?: string;
  route?: string;
  status?: 'success' | 'failure';
  req?: any;
  metadata?: any;
}

export async function recordAudit(options: AuditEntryOptions): Promise<void> {
  try {
    const req = options.req;
    const uaHeader = req?.headers ? req.headers['user-agent'] : '';
    const { deviceType, os, browser, userAgent } = parseUserAgent(uaHeader);
    const ip = req ? extractClientIp(req) : '127.0.0.1';

    let actorId = options.actor?._id || options.actor?.id || (req?.user?._id || req?.user?.id);
    let actorName = options.actorName || options.actor?.name || req?.user?.name;
    let actorEmail = options.actorEmail || options.actor?.email || req?.user?.email;
    let actorRole = options.actorRole || options.actor?.role || req?.user?.role || 'guest';

    if (!actorName) {
      if (options.actorEmail) actorName = options.actorEmail.split('@')[0];
      else actorName = actorRole === 'guest' ? 'Anonymous / Applicant' : 'System';
    }

    const description = options.description || `${options.action} on ${options.resource}`;
    const route = options.route || (req ? `${req.method} ${req.originalUrl || req.url}` : '');

    await AuditLog.create({
      actorId: actorId ? String(actorId) : undefined,
      actorName,
      actorEmail: actorEmail || '',
      actorRole,
      action: options.action,
      description,
      resource: options.resource,
      resourceId: options.resourceId,
      route,
      status: options.status || 'success',
      ip,
      ipAddress: ip,
      deviceType,
      os,
      browser,
      userAgent,
      metadata: options.metadata
    });
  } catch (err) {
    console.warn('[audit.service] Failed to record audit log:', err instanceof Error ? err.message : err);
  }
}
