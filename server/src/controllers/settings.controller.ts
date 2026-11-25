import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import Setting from '../models/Setting.js';
import { fallbackSettings } from '../utils/fallbackData.js';
import { connectDatabase } from '../config/db.js';
import { fastCache } from '../utils/fastCache.js';
import { ensureCloudinaryUrl } from '../services/media.service.js';

export async function getSettings(_req: Request, res: Response) {
  const cached = fastCache.get('settings:main');
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const setting = await Setting.findOne({ singleton: 'main' }).lean().maxTimeMS(1500);
      if (setting) {
        const data = { ...fallbackSettings, ...setting, membershipFee: 0 };
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
    const body = { ...req.body };
    // Membership fees do not exist for Young Scholars or Supervisors; payment accounts are strictly for Academy Students
    body.membershipFee = 0;
    if (body.heroImage) body.heroImage = await ensureCloudinaryUrl(body.heroImage, 'aspier/settings');
    if (body.founderPhoto) body.founderPhoto = await ensureCloudinaryUrl(body.founderPhoto, 'aspier/settings');
    if (body.aspierLogoUrl) body.aspierLogoUrl = await ensureCloudinaryUrl(body.aspierLogoUrl, 'aspier/settings');
    if (body.academyLogoUrl) body.academyLogoUrl = await ensureCloudinaryUrl(body.academyLogoUrl, 'aspier/settings');

    const updated = await Setting.findOneAndUpdate({ singleton: 'main' }, body, { new: true, upsert: true, runValidators: true });
    fastCache.invalidate('settings');
    res.json({ success: true, data: updated });
  } catch (err) {
    console.warn('[updateSettings] DB save fallback:', err instanceof Error ? err.message : err);
    delete req.body.membershipFee;
    Object.assign(fallbackSettings, req.body, { membershipFee: 0 });
    fastCache.invalidate('settings');
    res.json({ success: true, data: { ...fallbackSettings, ...req.body, membershipFee: 0 } });
  }
}
