import type { Request, Response } from 'express';
import Setting from '../models/Setting.js';
export async function getSettings(_req: Request, res: Response) { res.json({ success: true, data: await Setting.findOne({ singleton: 'main' }) || await Setting.create({ singleton: 'main' }) }); }
export async function updateSettings(req: Request, res: Response) { res.json({ success: true, data: await Setting.findOneAndUpdate({ singleton: 'main' }, req.body, { new: true, upsert: true, runValidators: true }) }); }
