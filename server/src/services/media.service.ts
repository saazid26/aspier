import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js';
import MediaAsset from '../models/MediaAsset.js';
import { connectDatabase } from '../config/db.js';

export type FileUploadInput = Express.Multer.File | { dataUrl: string; filename?: string; mimeType?: string };

export async function saveMedia(
  fileOrData: FileUploadInput,
  uploadedBy?: string,
  membershipApplicationId?: string
) {
  let buffer: Buffer;
  let filename: string;
  let mimeType: string;
  let size: number;

  if ('buffer' in fileOrData) {
    buffer = fileOrData.buffer;
    filename = fileOrData.originalname ? fileOrData.originalname.replace(/[^a-z0-9._-]/gi, '_') : `upload-${Date.now()}.webp`;
    mimeType = fileOrData.mimetype || 'image/webp';
    size = fileOrData.size || buffer.length;
  } else {
    const { dataUrl, filename: fname, mimeType: explicitMime } = fileOrData;
    filename = fname ? fname.replace(/[^a-z0-9._-]/gi, '_') : `upload-${Date.now()}.webp`;
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches && matches[2]) {
      mimeType = explicitMime || matches[1] || 'image/webp';
      buffer = Buffer.from(matches[2], 'base64');
      size = buffer.length;
    } else {
      buffer = Buffer.from(dataUrl);
      mimeType = explicitMime || 'image/webp';
      size = buffer.length;
    }
  }

  let publicId = '';
  let url = '';

  // 1. Try Cloudinary if enabled
  if (cloudinaryEnabled) {
    try {
      const uploaded = await cloudinary.uploader.upload(
        `data:${mimeType};base64,${buffer.toString('base64')}`,
        { folder: 'aspier' }
      );
      url = uploaded.secure_url;
      publicId = uploaded.public_id;
    } catch (cErr) {
      console.warn('[media.service] Cloudinary upload failed, falling back to MongoDB Buffer:', cErr);
    }
  }

  // 2. Generate clean MediaAsset MongoDB ID and route URL
  const assetId = new mongoose.Types.ObjectId();
  if (!url) {
    url = `/api/v1/media/${assetId}`;
  }

  // Optional local file copy in dev environment
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    try {
      const uploadDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      const localName = `${randomUUID()}-${filename}`;
      await fs.writeFile(path.join(uploadDir, localName), buffer);
    } catch (fsErr) {
      // Non-fatal fallback for local dev
    }
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase().catch(() => {});
    }

    const doc = await MediaAsset.create({
      _id: assetId,
      url,
      publicId,
      filename,
      mimeType,
      contentType: mimeType,
      data: buffer,
      size,
      ...(uploadedBy && mongoose.isValidObjectId(uploadedBy) ? { uploadedBy } : {}),
      ...(membershipApplicationId && mongoose.isValidObjectId(membershipApplicationId) ? { membershipApplicationId } : {})
    });
    return doc;
  } catch (err) {
    console.warn('[saveMedia] DB save error, returning standalone asset:', err);
    return {
      _id: assetId,
      url,
      publicId,
      filename,
      mimeType,
      contentType: mimeType,
      size,
      data: buffer
    };
  }
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const asset = await MediaAsset.findById(id);
  if (!asset) throw new Error('Media asset not found');
  if (asset.publicId && cloudinaryEnabled) {
    const result = await cloudinary.uploader.destroy(asset.publicId);
    if (result.result !== 'ok' && result.result !== 'not found') throw new Error('Cloudinary could not delete the media asset');
  } else if (asset.url.startsWith('/uploads/')) {
    try {
      const uploadDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
      const filePath = path.resolve(uploadDir, path.basename(asset.url));
      if (path.dirname(filePath) === uploadDir) {
        await fs.unlink(filePath);
      }
    } catch {}
  }
  await asset.deleteOne();
}

/**
 * High-performance streaming controller for binary MediaAssets stored in MongoDB
 */
export async function serveMediaAsset(req: any, res: any) {
  try {
    const rawId = req.params?.id || req.params?.filename;
    if (!rawId) return res.status(404).send('Not found');

    const cleanId = String(rawId).trim();

    if (mongoose.connection.readyState !== 1) {
      await connectDatabase().catch(() => {});
    }

    let asset: any = null;
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      asset = await MediaAsset.findById(cleanId);
    }
    if (!asset) {
      asset = await MediaAsset.findOne({
        $or: [
          { filename: cleanId },
          { publicId: cleanId },
          { url: { $regex: cleanId, $options: 'i' } }
        ]
      });
    }

    if (asset) {
      // 1. Binary stream from MongoDB
      if (asset.data && asset.data.length > 0) {
        const contentType = asset.contentType || asset.mimeType || 'image/webp';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', String(asset.data.length));
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(asset.data);
      }

      // 2. Base64 data URI decode
      if (asset.url && asset.url.startsWith('data:')) {
        const matches = asset.url.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const buf = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', matches[1] || 'image/webp');
          res.setHeader('Content-Length', String(buf.length));
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return res.send(buf);
        }
      }

      // 3. Cloudinary or external URL redirect
      if (asset.url && (asset.url.startsWith('http://') || asset.url.startsWith('https://'))) {
        return res.redirect(302, asset.url);
      }
    }

    return res.status(404).send('Media asset not found');
  } catch (err: any) {
    console.error('[serveMediaAsset] Error streaming media asset:', err);
    return res.status(404).send('Error loading media asset');
  }
}

