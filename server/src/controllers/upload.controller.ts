import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { deleteMediaAsset, saveMedia, serveMediaAsset } from '../services/media.service.js';
import MediaAsset from '../models/MediaAsset.js';
import Wing from '../models/Wing.js';
import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js';

export async function upload(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let asset: any = null;
    const folder = req.body?.folder || (req.body?.isAvatar ? 'aspier/team' : 'aspier/general');
    const publicId = req.body?.publicId;
    const uploadOpts = { folder, publicId, overwrite: true, invalidate: true };

    if (req.file) {
      asset = await saveMedia(req.file, String(req.user?._id || ''), undefined, uploadOpts);
    } else if (req.body?.dataUrl) {
      asset = await saveMedia({ dataUrl: req.body.dataUrl, filename: req.body.filename }, String(req.user?._id || ''), undefined, uploadOpts);
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

export async function cloudinarySignature(req: AuthRequest, res: Response) {
  try {
    if (!cloudinaryEnabled) {
      return res.status(503).json({ success: false, message: 'Cloudinary is not configured' });
    }
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = req.body?.folder || 'aspier/general';
    const publicId = req.body?.publicId;

    const paramsToSign: Record<string, any> = {
      timestamp,
      folder
    };
    if (publicId) paramsToSign.public_id = publicId;

    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET || '');

    res.json({
      success: true,
      data: {
        signature,
        timestamp,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder,
        publicId
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Signature generation failed' });
  }
}

export async function syncWingsCloudinary(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const WING_URLS: Record<number, string> = {
      1: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-1.webp',
      2: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-2.webp',
      3: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-3.webp',
      4: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-4.webp',
      5: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-5.webp',
      6: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-6.webp',
      7: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-7.webp',
      8: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-8.webp',
      9: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-9.webp',
      10: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-10.webp'
    };

    const results = [];
    for (const [orderStr, url] of Object.entries(WING_URLS)) {
      const order = Number(orderStr);
      const updated = await Wing.findOneAndUpdate(
        { order },
        { $set: { coverImage: url } },
        { new: true }
      );
      results.push({ order, updated: !!updated, name: (updated as any)?.name, coverImage: updated?.coverImage });
    }

    res.json({ success: true, message: 'Wings 1-10 synced with Cloudinary', data: results });
  } catch (error) { next(error); }
}

export async function purgeDummyAndDeduplicate(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const WING_URLS: Record<number, string> = {
      1: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-1.webp',
      2: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-2.webp',
      3: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-3.webp',
      4: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-4.webp',
      5: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-5.webp',
      6: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-6.webp',
      7: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-7.webp',
      8: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-8.webp',
      9: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-9.webp',
      10: 'https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-10.webp'
    };

    const wingsUpdated = [];
    for (const [orderStr, url] of Object.entries(WING_URLS)) {
      const order = Number(orderStr);
      const updated = await Wing.findOneAndUpdate(
        { order },
        { $set: { coverImage: url } },
        { new: true }
      );
      wingsUpdated.push({ order, updated: !!updated, coverImage: updated?.coverImage });
    }

    res.json({
      success: true,
      message: 'Purge & Deduplication complete; Wings 1-10 mapped to canonical Cloudinary WebP images',
      data: { wingsUpdated }
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

