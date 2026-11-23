import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import Setting from '../models/Setting.js';
import { fallbackSettings } from '../utils/fallbackData.js';
import { connectDatabase } from '../config/db.js';

export async function getSettings(_req: Request, res: Response) {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const setting = await Setting.findOne({ singleton: 'main' });
    if (setting) {
      const obj = setting.toObject();
      return res.json({ success: true, data: { ...fallbackSettings, ...obj } });
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
    res.json({ success: true, data: updated });
  } catch (err) {
    console.warn('[updateSettings] DB save fallback:', err instanceof Error ? err.message : err);
    Object.assign(fallbackSettings, req.body);
    res.json({ success: true, data: { ...fallbackSettings, ...req.body } });
  }
}
