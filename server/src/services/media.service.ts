import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js';
import MediaAsset from '../models/MediaAsset.js';
import { connectDatabase } from '../config/db.js';

export type FileUploadInput = Express.Multer.File | { dataUrl: string; filename?: string; mimeType?: string };

/**
 * Uploads a Buffer or Base64 data URL directly to Cloudinary (folder: aspier, format: webp, quality: auto).
 */
export async function uploadToCloudinary(
  bufferOrDataUrl: Buffer | string,
  options: { folder?: string; filename?: string; mimeType?: string } = {}
): Promise<{ url: string; publicId: string }> {
  const folder = options.folder || 'aspier';
  let dataUri: string;
  let isSvg = false;
  if (Buffer.isBuffer(bufferOrDataUrl)) {
    const mime = options.mimeType || 'image/webp';
    isSvg = mime.includes('svg');
    dataUri = `data:${mime};base64,${bufferOrDataUrl.toString('base64')}`;
  } else {
    dataUri = bufferOrDataUrl;
    if (dataUri.startsWith('data:image/svg+xml')) {
      isSvg = true;
      if (!dataUri.includes(';base64,')) {
        try {
          const rawSvg = decodeURIComponent(dataUri.replace(/^data:image\/svg\+xml;[^,]*,/, ''));
          dataUri = 'data:image/svg+xml;base64,' + Buffer.from(rawSvg).toString('base64');
        } catch {}
      }
    }
  }

  const uploadOptions: any = {
    folder,
    resource_type: 'image'
  };
  if (!isSvg) {
    uploadOptions.format = 'webp';
    uploadOptions.quality = 'auto';
  }

  const uploaded = await cloudinary.uploader.upload(dataUri, uploadOptions);

  return {
    url: uploaded.secure_url,
    publicId: uploaded.public_id
  };
}

/**
 * Intercepts any incoming image string (e.g. in Wing, Team, Research, News)
 * and if it is Base64 data or a /media/:id route, automatically resolves/uploads to Cloudinary and returns the secure URL.
 */
export async function ensureCloudinaryUrl(urlOrBase64?: string, folder = 'aspier'): Promise<string> {
  if (!urlOrBase64 || typeof urlOrBase64 !== 'string') return '';
  const trimmed = urlOrBase64.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('https://res.cloudinary.com/') || trimmed.startsWith('http://res.cloudinary.com/')) return trimmed;

  if (trimmed.startsWith('data:image/')) {
    try {
      const res = await uploadToCloudinary(trimmed, { folder });
      return res.url;
    } catch (err) {
      console.warn('[ensureCloudinaryUrl] Failed to upload base64 to Cloudinary:', err);
      return trimmed;
    }
  }

  const mediaMatch = trimmed.match(/\/api\/(?:v1\/)?media\/([a-zA-Z0-9_-]+)/);
  if (mediaMatch && mediaMatch[1]) {
    try {
      if (mongoose.connection.readyState !== 1) {
        await connectDatabase().catch(() => {});
      }
      const assetId = mediaMatch[1];
      let asset: any = null;
      if (mongoose.Types.ObjectId.isValid(assetId)) {
        asset = await MediaAsset.findById(assetId);
      }
      if (!asset) {
        asset = await MediaAsset.findOne({
          $or: [{ filename: assetId }, { publicId: assetId }]
        });
      }
      if (asset) {
        if (asset.url && (asset.url.startsWith('https://res.cloudinary.com/') || asset.url.startsWith('http://res.cloudinary.com/'))) {
          return asset.url;
        }
        if (asset.data && asset.data.length > 0) {
          const res = await uploadToCloudinary(asset.data, { folder, mimeType: asset.contentType || asset.mimeType });
          await MediaAsset.updateOne({ _id: asset._id }, { $set: { url: res.url, publicId: res.publicId }, $unset: { data: 1 } });
          return res.url;
        }
        if (asset.url && asset.url.startsWith('data:image/')) {
          const res = await uploadToCloudinary(asset.url, { folder });
          await MediaAsset.updateOne({ _id: asset._id }, { $set: { url: res.url, publicId: res.publicId }, $unset: { data: 1 } });
          return res.url;
        }
      }
    } catch (err) {
      console.warn('[ensureCloudinaryUrl] Failed to resolve media asset to Cloudinary:', err);
    }
  }

  return trimmed;
}

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

  // 1. Upload exclusively to Cloudinary
  let url = '';
  let publicId = '';

  try {
    const uploaded = await uploadToCloudinary(buffer, { folder: 'aspier', filename, mimeType });
    url = uploaded.url;
    publicId = uploaded.publicId;
  } catch (cErr) {
    console.error('[media.service] Cloudinary upload error:', cErr);
    // If Cloudinary somehow fails, generate safe fallback URL
    const assetId = new mongoose.Types.ObjectId();
    url = `/api/v1/media/${assetId}`;
  }

  const assetId = new mongoose.Types.ObjectId();

  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase().catch(() => {});
    }

    // STRICT: Only store lightweight metadata and the secure Cloudinary URL.
    // Zero binary Buffer or Base64 is stored in MongoDB!
    const doc = await MediaAsset.create({
      _id: assetId,
      url,
      publicId,
      filename,
      mimeType: 'image/webp',
      contentType: 'image/webp',
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
      mimeType: 'image/webp',
      contentType: 'image/webp',
      size
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
 * High-performance streaming controller for MediaAssets
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
      // 1. If url is Cloudinary, 302 redirect directly
      if (asset.url && (asset.url.startsWith('https://res.cloudinary.com/') || asset.url.startsWith('http://res.cloudinary.com/'))) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.redirect(302, asset.url);
      }

      // 2. Binary stream if legacy Buffer exists
      if (asset.data && asset.data.length > 0) {
        const contentType = asset.contentType || asset.mimeType || 'image/webp';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', String(asset.data.length));
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(asset.data);
      }

      // 3. Base64 data URI decode
      if (asset.url && asset.url.startsWith('data:')) {
        const matches = asset.url.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const buf = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', matches[1] || 'image/webp');
          res.setHeader('Content-Length', String(buf.length));
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return res.send(buf);
        }
      }

      // 4. External URL redirect
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


