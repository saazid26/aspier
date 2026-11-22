import type { Request, Response, NextFunction } from 'express';
import mongoose, { type Model } from 'mongoose';
import { slugify } from '../utils/slug.js';
import AuditLog from '../models/AuditLog.js';
import { hashPassword, passwordStrength } from '../services/password.service.js';
import { FIXED_ADMIN_EMAIL } from '../config/env.js';
export function crudFactory(model: Model<any>) {
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        if (mongoose.connection.readyState !== 1) {
          return res.json({ success: true, data: [], pagination: { page, limit, total: 0, pages: 0 } });
        }
        const search = String(req.query.search || '').trim();
        const filter: Record<string, unknown> = {};
        Object.entries(req.query).forEach(([key, value]) => {
          if (!['page', 'limit', 'search'].includes(key) && typeof value === 'string') filter[key] = value;
        });
        if (search) filter.$or = ['name', 'title', 'email', 'subject', 'trxId'].filter((k) => model.schema.path(k)).map((k) => ({ [k]: { $regex: search, $options: 'i' } }));
        const [items, total] = await Promise.all([model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), model.countDocuments(filter)]);
        res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
      } catch (error) { next(error); }
    },
    getById: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (mongoose.connection.readyState !== 1) return res.status(404).json({ success: false, message: 'Not found' });
        const item = await model.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: item });
      } catch (error) { next(error); }
    },
    create: async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
      try {
        if (mongoose.connection.readyState !== 1) {
          return res.status(503).json({ success: false, message: 'Database is synchronizing. Please retry shortly.' });
        }
        const body = { ...req.body };
        if (model.modelName === 'User') {
          if (['admin', 'superadmin'].includes(body.role) && String(body.email || '').trim().toLowerCase() !== FIXED_ADMIN_EMAIL) {
            return res.status(400).json({ success: false, message: 'Only the fixed ASPIER administrator email may have an administrator role' });
          }
          if (body.role === 'superadmin' && req.user?.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Only a superadmin can assign the superadmin role' });
          delete body.passwordHash;
          delete body.refreshTokens;
          delete body.twoFactorSecretEncrypted;
          delete body.passwordResetTokenHash;
          delete body.resetExpires;
          const password = String(body.password || '');
          delete body.password;
          if (!password) return res.status(400).json({ success: false, message: 'A password is required for a new user' });
          const errors = passwordStrength(password);
          if (errors.length) return res.status(400).json({ success: false, message: errors.join('. ') });
          body.passwordHash = await hashPassword(password);
        }
        if (!body.slug && body.title) body.slug = slugify(body.title);
        if (!body.slug && body.name) body.slug = slugify(body.name);
        const item = await model.create(body);
        const metadata = { ...body };
        delete metadata.passwordHash;
        await AuditLog.create({ actorId: req.user?._id, action: 'create', resource: model.modelName, resourceId: String(item._id), ip: req.ip, userAgent: req.headers['user-agent'], metadata }).catch((err) => console.warn('[audit create]', err));
        if (model.modelName === 'User') item.passwordHash = undefined;
        res.status(201).json({ success: true, data: item });
      } catch (error) { next(error); }
    },
    update: async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
      try {
        if (mongoose.connection.readyState !== 1) {
          return res.status(503).json({ success: false, message: 'Database is synchronizing. Please retry shortly.' });
        }
        const body = { ...req.body };
        if (model.modelName === 'User') {
          const target = await model.findById(req.params.id);
          if (!target) return res.status(404).json({ success: false, message: 'Not found' });
          const resultingRole = body.role ?? target.role;
          const resultingEmail = String(body.email ?? target.email).trim().toLowerCase();
          if (['admin', 'superadmin'].includes(resultingRole) && resultingEmail !== FIXED_ADMIN_EMAIL) {
            return res.status(400).json({ success: false, message: 'Only the fixed ASPIER administrator email may have an administrator role' });
          }
          if (['admin', 'superadmin'].includes(target.role)) {
            if (resultingEmail !== FIXED_ADMIN_EMAIL) return res.status(400).json({ success: false, message: 'The fixed administrator email cannot be changed' });
            if (body.password) return res.status(403).json({ success: false, message: 'The fixed administrator password cannot be changed' });
            if (body.role && !['admin', 'superadmin'].includes(body.role)) return res.status(403).json({ success: false, message: 'The fixed administrator role cannot be removed' });
            if (body.isActive === false) return res.status(403).json({ success: false, message: 'The fixed administrator account cannot be deactivated' });
          }
          if (target.role === 'superadmin' && req.user?.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Only a superadmin can modify a superadmin account' });
          if (body.role === 'superadmin' && req.user?.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Only a superadmin can assign the superadmin role' });
          delete body.passwordHash;
          delete body.refreshTokens;
          delete body.twoFactorSecretEncrypted;
          delete body.passwordResetTokenHash;
          delete body.resetExpires;
          const password = String(body.password || '');
          delete body.password;
          if (password) {
            const errors = passwordStrength(password);
            if (errors.length) return res.status(400).json({ success: false, message: errors.join('. ') });
            body.passwordHash = await hashPassword(password);
          }
        }
        if (body.title && !body.slug) body.slug = slugify(body.title);
        const item = await model.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ success: false, message: 'Not found' });
        const metadata = { ...body };
        delete metadata.passwordHash;
        await AuditLog.create({ actorId: req.user?._id, action: 'update', resource: model.modelName, resourceId: req.params.id, ip: req.ip, userAgent: req.headers['user-agent'], metadata }).catch((err) => console.warn('[audit update]', err));
        res.json({ success: true, data: item });
      } catch (error) { next(error); }
    },
    delete: async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
      try {
        if (mongoose.connection.readyState !== 1) {
          return res.status(503).json({ success: false, message: 'Database is synchronizing. Please retry shortly.' });
        }
        if (model.modelName === 'User') {
          const target = await model.findById(req.params.id);
          if (!target) return res.status(404).json({ success: false, message: 'Not found' });
          if (['admin', 'superadmin'].includes(target.role)) return res.status(403).json({ success: false, message: 'The fixed ASPIER administrator account cannot be deleted' });
          if (target.role === 'superadmin' && req.user?.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Only a superadmin can delete a superadmin account' });
        }
        const item = await model.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Not found' });
        await AuditLog.create({ actorId: req.user?._id, action: 'delete', resource: model.modelName, resourceId: req.params.id, ip: req.ip, userAgent: req.headers['user-agent'] }).catch((err) => console.warn('[audit delete]', err));
        res.json({ success: true, message: 'Deleted' });
      } catch (error) { next(error); }
    }
  };
}
