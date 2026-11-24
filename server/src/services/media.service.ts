import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js';
import MediaAsset from '../models/MediaAsset.js';
export async function saveMedia(file: Express.Multer.File, uploadedBy?: string, membershipApplicationId?: string) {
  let url: string;
  let publicId = '';
  if (cloudinaryEnabled) {
    const uploaded = await cloudinary.uploader.upload(`data:${file.mimetype};base64,${file.buffer.toString('base64')}`, { folder: 'aspier' });
    url = uploaded.secure_url; publicId = uploaded.public_id;
  } else if (process.env.VERCEL === '1') {
    url = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  } else {
    try {
      const uploadDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      const filename = `${randomUUID()}-${file.originalname.replace(/[^a-z0-9.-]/gi, '_')}`;
      await fs.writeFile(path.join(uploadDir, filename), file.buffer);
      url = `/uploads/${filename}`;
    } catch (fsErr) {
      console.warn('[media.service] Local storage write failed (e.g. read-only filesystem), falling back to base64 data URL:', fsErr);
      url = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }
  }
  try {
    return await MediaAsset.create({ url, publicId, filename: file.originalname, mimeType: file.mimetype, size: file.size, ...(uploadedBy ? { uploadedBy } : {}), ...(membershipApplicationId ? { membershipApplicationId } : {}) });
  } catch (err) {
    console.warn('[saveMedia] DB save error, returning standalone asset:', err);
    return {
      _id: randomUUID(),
      url,
      publicId,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size
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
    const uploadDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
    const filePath = path.resolve(uploadDir, path.basename(asset.url));
    if (path.dirname(filePath) !== uploadDir) throw new Error('Invalid local media path');
    await fs.unlink(filePath);
  }
  await asset.deleteOne();
}
