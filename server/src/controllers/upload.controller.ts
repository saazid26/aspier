import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { deleteMediaAsset, saveMedia } from '../services/media.service.js';
import MediaAsset from '../models/MediaAsset.js';
export async function upload(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File is required' });
    res.status(201).json({ success: true, data: await saveMedia(req.file, String(req.user._id)) });
  } catch (error) { next(error); }
}
export async function mediaLibrary(_req: AuthRequest, res: Response) {
  try {
    const assets = await MediaAsset.find().sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: assets || [] });
  } catch (err) {
    console.warn('[mediaLibrary] DB error, fallback to empty array:', err);
    res.json({ success: true, data: [] });
  }
}
export async function deleteMedia(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    if (!id) return res.status(400).json({ success: false, message: 'Media ID is required' });
    await deleteMediaAsset(id);
    res.json({ success: true, message: 'Media deleted' });
  } catch (error) { next(error); }
}
