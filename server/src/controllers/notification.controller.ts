import type { Response } from 'express';
import Notification from '../models/Notification.js';
import type { AuthRequest } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export async function listAdminNotifications(_req: AuthRequest, res: Response) {
  const [items, unreadCount] = await Promise.all([
    Notification.find({ audience: 'admin' }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ audience: 'admin', readAt: { $exists: false } })
  ]);
  res.json({ success: true, data: { items, unreadCount } });
}

export async function listMemberNotifications(req: AuthRequest, res: Response) {
  const [items, unreadCount] = await Promise.all([
    Notification.find({ audience: 'member', userId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ audience: 'member', userId: req.user._id, readAt: { $exists: false } })
  ]);
  res.json({ success: true, data: { items, unreadCount } });
}

export async function markAdminNotificationRead(req: AuthRequest, res: Response) {
  const result = await Notification.updateOne({ _id: req.params.id, audience: 'admin' }, { $set: { readAt: new Date() } });
  if (!result.matchedCount) throw new HttpError(404, 'Notification not found');
  res.json({ success: true });
}

export async function markMemberNotificationRead(req: AuthRequest, res: Response) {
  const result = await Notification.updateOne({ _id: req.params.id, audience: 'member', userId: req.user._id }, { $set: { readAt: new Date() } });
  if (!result.matchedCount) throw new HttpError(404, 'Notification not found');
  res.json({ success: true });
}
