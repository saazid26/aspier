import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { cloudinary } from '../config/cloudinary.js';
import { uploadToCloudinary } from './media.service.js';
import MediaAsset from '../models/MediaAsset.js';
import Wing from '../models/Wing.js';
import FoundingMember from '../models/FoundingMember.js';
import Supervisor from '../models/Supervisor.js';
import Scholar from '../models/Scholar.js';
import Research from '../models/Research.js';
import News from '../models/News.js';
import Course from '../models/Course.js';
import Instructor from '../models/Instructor.js';
import Setting from '../models/Setting.js';
import User from '../models/User.js';
import MembershipApplication from '../models/MembershipApplication.js';

export interface MigrationReport {
  success: boolean;
  timestamp: string;
  totalAssetsMigrated: number;
  totalImagesUploaded: number;
  binaryBufferPurgedCount: number;
  byCollection: {
    mediaAssets: number;
    wings: number;
    foundingMembers: number;
    supervisors: number;
    scholars: number;
    research: number;
    news: number;
    courses: number;
    instructors: number;
    settings: number;
    users: number;
    applications: number;
  };
  errors: Array<{ collection: string; id: string; error: string }>;
}

/**
 * Resolves any image URL or Base64 or /api/v1/media/:id to a permanent Cloudinary URL.
 */
async function resolveToCloudinary(
  urlOrData?: string | null,
  folder = 'aspier',
  errors: MigrationReport['errors'] = [],
  collectionName = 'unknown',
  docId = 'unknown'
): Promise<string> {
  if (!urlOrData || typeof urlOrData !== 'string') return '';
  const trimmed = urlOrData.trim();
  if (!trimmed) return '';

  // Already Cloudinary
  if (trimmed.startsWith('https://res.cloudinary.com/') || trimmed.startsWith('http://res.cloudinary.com/')) {
    return trimmed;
  }

  // Base64 Data URI
  if (trimmed.startsWith('data:image/')) {
    try {
      const res = await uploadToCloudinary(trimmed, { folder });
      return res.url;
    } catch (err: any) {
      errors.push({ collection: collectionName, id: docId, error: `Base64 upload failed: ${err.message}` });
      return trimmed;
    }
  }

  // /api/v1/media/:id or /api/media/:id
  const mediaMatch = trimmed.match(/\/api\/(?:v1\/)?media\/([a-zA-Z0-9_-]+)/);
  if (mediaMatch && mediaMatch[1]) {
    try {
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
    } catch (err: any) {
      errors.push({ collection: collectionName, id: docId, error: `MediaAsset resolution failed: ${err.message}` });
    }
  }

  // External HTTP image (e.g. Unsplash, Wikipedia)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const uploaded = await cloudinary.uploader.upload(trimmed, {
        folder,
        resource_type: 'image',
        format: 'webp',
        quality: 'auto'
      });
      return uploaded.secure_url;
    } catch (err: any) {
      // If external upload fails, preserve original url
      return trimmed;
    }
  }

  return trimmed;
}

export async function migrateAllImagesToCloudinary(): Promise<MigrationReport> {
  if (mongoose.connection.readyState !== 1) {
    await connectDatabase();
  }

  const report: MigrationReport = {
    success: true,
    timestamp: new Date().toISOString(),
    totalAssetsMigrated: 0,
    totalImagesUploaded: 0,
    binaryBufferPurgedCount: 0,
    byCollection: {
      mediaAssets: 0,
      wings: 0,
      foundingMembers: 0,
      supervisors: 0,
      scholars: 0,
      research: 0,
      news: 0,
      courses: 0,
      instructors: 0,
      settings: 0,
      users: 0,
      applications: 0
    },
    errors: []
  };

  console.log('[MIGRATION] Starting full-stack Cloudinary image migration...');

  // 1. Migrate MediaAsset collection
  try {
    const assets = await MediaAsset.find();
    for (const asset of assets) {
      const assetDoc = asset as any;
      let needsUpdate = false;
      let newUrl = assetDoc.url;
      let newPublicId = assetDoc.publicId;

      if (assetDoc.data && assetDoc.data.length > 0) {
        try {
          const res = await uploadToCloudinary(assetDoc.data, {
            folder: 'aspier/migrated',
            mimeType: assetDoc.contentType || assetDoc.mimeType
          });
          newUrl = res.url;
          newPublicId = res.publicId;
          needsUpdate = true;
          report.totalImagesUploaded++;
        } catch (err: any) {
          report.errors.push({ collection: 'MediaAsset', id: String(assetDoc._id), error: err.message });
        }
      } else if (assetDoc.url && assetDoc.url.startsWith('data:image/')) {
        try {
          const res = await uploadToCloudinary(assetDoc.url, { folder: 'aspier/migrated' });
          newUrl = res.url;
          newPublicId = res.publicId;
          needsUpdate = true;
          report.totalImagesUploaded++;
        } catch (err: any) {
          report.errors.push({ collection: 'MediaAsset', id: String(assetDoc._id), error: err.message });
        }
      }

      if (needsUpdate || assetDoc.data) {
        await MediaAsset.updateOne(
          { _id: assetDoc._id },
          { $set: { url: newUrl, ...(newPublicId ? { publicId: newPublicId } : {}) }, $unset: { data: 1 } }
        );
        report.byCollection.mediaAssets++;
      }
    }

    // Purge ALL remaining binary data fields across MediaAsset
    const purgeResult = await MediaAsset.updateMany({ data: { $exists: true } }, { $unset: { data: 1 } });
    report.binaryBufferPurgedCount = purgeResult.modifiedCount || 0;
  } catch (err: any) {
    report.errors.push({ collection: 'MediaAsset', id: 'bulk', error: err.message });
  }

  // 2. Migrate Wings
  try {
    const wings = await Wing.find();
    for (const wing of wings) {
      if (wing.coverImage) {
        const newUrl = await resolveToCloudinary(wing.coverImage, 'aspier/wings', report.errors, 'Wing', String(wing._id));
        if (newUrl && newUrl !== wing.coverImage) {
          await Wing.updateOne({ _id: wing._id }, { $set: { coverImage: newUrl } });
          report.byCollection.wings++;
        }
      }
    }
  } catch (err: any) {
    report.errors.push({ collection: 'Wing', id: 'bulk', error: err.message });
  }

  // 3. Migrate FoundingMembers
  try {
    const members = await FoundingMember.find();
    for (const m of members) {
      if (m.photo) {
        const newUrl = await resolveToCloudinary(m.photo, 'aspier/team', report.errors, 'FoundingMember', String(m._id));
        if (newUrl && newUrl !== m.photo) {
          await FoundingMember.updateOne({ _id: m._id }, { $set: { photo: newUrl } });
          report.byCollection.foundingMembers++;
        }
      }
    }
  } catch (err: any) {
    report.errors.push({ collection: 'FoundingMember', id: 'bulk', error: err.message });
  }

  // 4. Migrate Supervisors
  try {
    const sups = await Supervisor.find();
    for (const s of sups) {
      if (s.photo) {
        const newUrl = await resolveToCloudinary(s.photo, 'aspier/team', report.errors, 'Supervisor', String(s._id));
        if (newUrl && newUrl !== s.photo) {
          await Supervisor.updateOne({ _id: s._id }, { $set: { photo: newUrl } });
          report.byCollection.supervisors++;
        }
      }
    }
  } catch (err: any) {
    report.errors.push({ collection: 'Supervisor', id: 'bulk', error: err.message });
  }

  // 5. Migrate Scholars
  try {
    const scholars = await Scholar.find();
    for (const sc of scholars) {
      if (sc.photo) {
        const newUrl = await resolveToCloudinary(sc.photo, 'aspier/team', report.errors, 'Scholar', String(sc._id));
        if (newUrl && newUrl !== sc.photo) {
          await Scholar.updateOne({ _id: sc._id }, { $set: { photo: newUrl } });
          report.byCollection.scholars++;
        }
      }
    }
  } catch (err: any) {
    report.errors.push({ collection: 'Scholar', id: 'bulk', error: err.message });
  }

  // 6. Migrate Research
  try {
    const items = await Research.find();
    for (const r of items) {
      if (r.coverImage) {
        const newUrl = await resolveToCloudinary(r.coverImage, 'aspier/research', report.errors, 'Research', String(r._id));
        if (newUrl && newUrl !== r.coverImage) {
          await Research.updateOne({ _id: r._id }, { $set: { coverImage: newUrl } });
          report.byCollection.research++;
        }
      }
    }
  } catch (err: any) {
    report.errors.push({ collection: 'Research', id: 'bulk', error: err.message });
  }

  // 7. Migrate News
  try {
    const items = await News.find();
    for (const n of items) {
      if (n.coverImage) {
        const newUrl = await resolveToCloudinary(n.coverImage, 'aspier/news', report.errors, 'News', String(n._id));
        if (newUrl && newUrl !== n.coverImage) {
          await News.updateOne({ _id: n._id }, { $set: { coverImage: newUrl } });
          report.byCollection.news++;
        }
      }
    }
  } catch (err: any) {
    report.errors.push({ collection: 'News', id: 'bulk', error: err.message });
  }

  // 8. Migrate Courses
  try {
    const courses = await Course.find();
    for (const c of courses) {
      let changed = false;
      const updates: any = {};
      if (c.thumbnail) {
        const newThumb = await resolveToCloudinary(c.thumbnail, 'aspier/courses', report.errors, 'Course', String(c._id));
        if (newThumb && newThumb !== c.thumbnail) {
          updates.thumbnail = newThumb;
          changed = true;
        }
      }
      if (c.bannerUrl) {
        const newBanner = await resolveToCloudinary(c.bannerUrl, 'aspier/courses', report.errors, 'Course', String(c._id));
        if (newBanner && newBanner !== c.bannerUrl) {
          updates.bannerUrl = newBanner;
          changed = true;
        }
      }
      if (changed) {
        await Course.updateOne({ _id: c._id }, { $set: updates });
        report.byCollection.courses++;
      }
    }
  } catch (err: any) {
    report.errors.push({ collection: 'Course', id: 'bulk', error: err.message });
  }

  // 9. Migrate Instructors
  try {
    const insts = await Instructor.find();
    for (const i of insts) {
      let changed = false;
      const updates: any = {};
      if (i.photo) {
        const newPhoto = await resolveToCloudinary(i.photo, 'aspier/instructors', report.errors, 'Instructor', String(i._id));
        if (newPhoto && newPhoto !== i.photo) {
          updates.photo = newPhoto;
          changed = true;
        }
      }
      if (i.avatar) {
        const newAvatar = await resolveToCloudinary(i.avatar, 'aspier/instructors', report.errors, 'Instructor', String(i._id));
        if (newAvatar && newAvatar !== i.avatar) {
          updates.avatar = newAvatar;
          changed = true;
        }
      }
      if (i.avatarUrl) {
        const newAvatarUrl = await resolveToCloudinary(i.avatarUrl, 'aspier/instructors', report.errors, 'Instructor', String(i._id));
        if (newAvatarUrl && newAvatarUrl !== i.avatarUrl) {
          updates.avatarUrl = newAvatarUrl;
          changed = true;
        }
      }
      if (changed) {
        await Instructor.updateOne({ _id: i._id }, { $set: updates });
        report.byCollection.instructors++;
      }
    }
  } catch (err: any) {
    report.errors.push({ collection: 'Instructor', id: 'bulk', error: err.message });
  }

  // 10. Migrate Settings
  try {
    const settings = await Setting.find();
    for (const s of settings) {
      let changed = false;
      const updates: any = {};
      if (s.heroImage) {
        const newHero = await resolveToCloudinary(s.heroImage, 'aspier/branding', report.errors, 'Setting', String(s._id));
        if (newHero && newHero !== s.heroImage) {
          updates.heroImage = newHero;
          changed = true;
        }
      }
      if (s.founderPhoto) {
        const newFounder = await resolveToCloudinary(s.founderPhoto, 'aspier/branding', report.errors, 'Setting', String(s._id));
        if (newFounder && newFounder !== s.founderPhoto) {
          updates.founderPhoto = newFounder;
          changed = true;
        }
      }
      if (s.aspierLogoUrl) {
        const newLogo = await resolveToCloudinary(s.aspierLogoUrl, 'aspier/branding', report.errors, 'Setting', String(s._id));
        if (newLogo && newLogo !== s.aspierLogoUrl) {
          updates.aspierLogoUrl = newLogo;
          changed = true;
        }
      }
      if (s.academyLogoUrl) {
        const newAcademy = await resolveToCloudinary(s.academyLogoUrl, 'aspier/branding', report.errors, 'Setting', String(s._id));
        if (newAcademy && newAcademy !== s.academyLogoUrl) {
          updates.academyLogoUrl = newAcademy;
          changed = true;
        }
      }
      if (changed) {
        await Setting.updateOne({ _id: s._id }, { $set: updates });
        report.byCollection.settings++;
      }
    }
  } catch (err: any) {
    report.errors.push({ collection: 'Setting', id: 'bulk', error: err.message });
  }

  // 11. Migrate Users (Avatars)
  try {
    const users = await User.find({ $or: [{ avatar: { $regex: '^data:image/' } }, { avatarUrl: { $regex: '^data:image/' } }] });
    for (const u of users) {
      let changed = false;
      const updates: any = {};
      if (u.avatar && u.avatar.startsWith('data:image/')) {
        const newAv = await resolveToCloudinary(u.avatar, 'aspier/avatars', report.errors, 'User', String(u._id));
        if (newAv && newAv !== u.avatar) {
          updates.avatar = newAv;
          changed = true;
        }
      }
      if (u.avatarUrl && u.avatarUrl.startsWith('data:image/')) {
        const newAvUrl = await resolveToCloudinary(u.avatarUrl, 'aspier/avatars', report.errors, 'User', String(u._id));
        if (newAvUrl && newAvUrl !== u.avatarUrl) {
          updates.avatarUrl = newAvUrl;
          changed = true;
        }
      }
      if (changed) {
        await User.updateOne({ _id: u._id }, { $set: updates });
        report.byCollection.users++;
      }
    }
  } catch (err: any) {
    report.errors.push({ collection: 'User', id: 'bulk', error: err.message });
  }

  // 12. Migrate Membership Applications (photos)
  try {
    const apps = await MembershipApplication.find({ photo: { $exists: true, $ne: '' } });
    for (const a of apps) {
      if (a.photo && (a.photo.startsWith('data:image/') || a.photo.includes('/media/'))) {
        const newPhoto = await resolveToCloudinary(a.photo, 'aspier/applications', report.errors, 'MembershipApplication', String(a._id));
        if (newPhoto && newPhoto !== a.photo) {
          await MembershipApplication.updateOne({ _id: a._id }, { $set: { photo: newPhoto } });
          report.byCollection.applications++;
        }
      }
    }
  } catch (err: any) {
    report.errors.push({ collection: 'MembershipApplication', id: 'bulk', error: err.message });
  }

  report.totalAssetsMigrated =
    report.byCollection.mediaAssets +
    report.byCollection.wings +
    report.byCollection.foundingMembers +
    report.byCollection.supervisors +
    report.byCollection.scholars +
    report.byCollection.research +
    report.byCollection.news +
    report.byCollection.courses +
    report.byCollection.instructors +
    report.byCollection.settings +
    report.byCollection.users +
    report.byCollection.applications;

  console.log('[MIGRATION] Full-stack Cloudinary image migration complete!', report);
  return report;
}
