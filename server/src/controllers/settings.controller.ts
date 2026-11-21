import type { Request, Response } from 'express';
import Setting from '../models/Setting.js';
import { fallbackSettings } from '../utils/fallbackData.js';

export async function getSettings(_req: Request, res: Response) {
  try {
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
  res.json({ success: true, data: await Setting.findOneAndUpdate({ singleton: 'main' }, req.body, { new: true, upsert: true, runValidators: true }) });
}
