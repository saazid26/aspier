import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import Setting from '../models/Setting.js';
import { fallbackSettings } from '../utils/fallbackData.js';
import { connectDatabase } from '../config/db.js';
import { fastCache } from '../utils/fastCache.js';

export async function getSettings(_req: Request, res: Response) {
  const cached = fastCache.get('settings:main');
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const setting = await Setting.findOne({ singleton: 'main' }).lean().maxTimeMS(1500);
      if (setting) {
        const data = { ...fallbackSettings, ...setting };
        fastCache.set('settings:main', data, 60);
        return res.json({ success: true, data });
      }
    }
  } catch (err) {
    console.warn('[getSettings] fallback:', err instanceof Error ? err.message : err);
  }
  return res.json({ success: true, data: fallbackSettings });
}

export async function updateSettings(req: Request, res: Response) {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const updated = await Setting.findOneAndUpdate({ singleton: 'main' }, req.body, { new: true, upsert: true, runValidators: true });
    fastCache.invalidate('settings');
    res.json({ success: true, data: updated });
  } catch (err) {
    console.warn('[updateSettings] DB save fallback:', err instanceof Error ? err.message : err);
    Object.assign(fallbackSettings, req.body);
    fastCache.invalidate('settings');
    res.json({ success: true, data: { ...fallbackSettings, ...req.body } });
  }
}
