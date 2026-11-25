import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { deleteMediaAsset, saveMedia, serveMediaAsset } from '../services/media.service.js';
import MediaAsset from '../models/MediaAsset.js';

export async function upload(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let asset: any = null;
    if (req.file) {
      asset = await saveMedia(req.file, String(req.user?._id || ''));
    } else if (req.body?.dataUrl) {
      asset = await saveMedia({ dataUrl: req.body.dataUrl, filename: req.body.filename }, String(req.user?._id || ''));
    } else {
      return res.status(400).json({ success: false, message: 'File or dataUrl is required' });
    }

    const payload = asset && typeof asset.toObject === 'function' ? asset.toObject() : asset;
    // Don't send large binary buffer in JSON response
    delete payload.data;

    res.status(201).json({
      success: true,
      data: payload,
      url: payload.url
    });
  } catch (error) { next(error); }
}

export async function mediaLibrary(_req: AuthRequest, res: Response) {
  try {
    const assets = await MediaAsset.find().select('-data').sort({ createdAt: -1 }).limit(200);
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

export { serveMediaAsset };

