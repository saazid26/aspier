import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js';
import { connectDatabase } from '../config/db.js';
import Wing from '../models/Wing.js';
import FoundingMember from '../models/FoundingMember.js';
import Supervisor from '../models/Supervisor.js';
import Scholar from '../models/Scholar.js';
import Research from '../models/Research.js';
import MediaAsset from '../models/MediaAsset.js';

const CANONICAL_WING_PUBLIC_IDS = new Set([
  'aspier/wings/wing-1',
  'aspier/wings/wing-2',
  'aspier/wings/wing-3',
  'aspier/wings/wing-4',
  'aspier/wings/wing-5',
  'aspier/wings/wing-6',
  'aspier/wings/wing-7',
  'aspier/wings/wing-8',
  'aspier/wings/wing-9',
  'aspier/wings/wing-10'
]);

function extractPublicIdFromUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  // Match Cloudinary URL format: .../image/upload/(v\d+/)?(aspier/.*?)(\.[a-zA-Z0-9]+)?$
  const match = url.match(/\/upload\/(?:v\d+\/)?(aspier\/[^.]+)(?:\.[a-zA-Z0-9]+)?/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

async function run() {
  console.log('=== Starting Cloudinary Deduplication & Wings Sync ===');
  if (!cloudinaryEnabled) {
    console.error('Cloudinary is not enabled. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    process.exit(1);
  }

  try {
    await connectDatabase();
    console.log('Connected to MongoDB');
  } catch (err) {
    console.warn('MongoDB connection failed or skipped:', err);
  }

  // 1. Sync Wings 1-10 in MongoDB
  console.log('\n--- Step 1: Syncing Wings 1-10 to deterministic Cloudinary URLs in MongoDB ---');
  for (let order = 1; order <= 10; order++) {
    const canonicalUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || 'w9zgpjap'}/image/upload/aspier/wings/wing-${order}.webp`;
    try {
      const res = await Wing.findOneAndUpdate(
        { order },
        { $set: { coverImage: canonicalUrl } },
        { new: true }
      );
      if (res) {
        console.log(`[Wing ${order}] Updated: "${(res as any).name}" -> ${canonicalUrl}`);
      } else {
        console.log(`[Wing ${order}] Document not found in DB with order ${order}`);
      }
    } catch (dbErr) {
      console.warn(`[Wing ${order}] DB update skipped/failed:`, dbErr);
    }
  }

  // 2. Collect all active public IDs from MongoDB models
  console.log('\n--- Step 2: Collecting all active in-use public IDs ---');
  const activePublicIds = new Set<string>(CANONICAL_WING_PUBLIC_IDS);

  try {
    const wings = await Wing.find();
    for (const w of wings) {
      const pid = extractPublicIdFromUrl(w.coverImage);
      if (pid) activePublicIds.add(pid);
    }

    const founders = await FoundingMember.find();
    for (const f of founders) {
      const pid = extractPublicIdFromUrl(f.photo);
      if (pid) activePublicIds.add(pid);
    }

    const sups = await Supervisor.find();
    for (const s of sups) {
      const pid = extractPublicIdFromUrl(s.photo);
      if (pid) activePublicIds.add(pid);
    }

    const scholars = await Scholar.find();
    for (const sc of scholars) {
      const pid = extractPublicIdFromUrl(sc.photo);
      if (pid) activePublicIds.add(pid);
    }

    const researches = await Research.find();
    for (const r of researches) {
      const pid = extractPublicIdFromUrl(r.coverImage);
      if (pid) activePublicIds.add(pid);
    }

    console.log(`Collected ${activePublicIds.size} active public IDs from DB & canonical list.`);
  } catch (err) {
    console.warn('Error reading from DB for active public IDs:', err);
  }

  // 3. Fetch all Cloudinary resources under 'aspier'
  console.log('\n--- Step 3: Fetching all Cloudinary assets in "aspier" folder ---');
  let allResources: any[] = [];
  let nextCursor: string | undefined = undefined;

  do {
    const res: any = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'aspier',
      max_results: 500,
      next_cursor: nextCursor
    });

    if (res.resources && Array.isArray(res.resources)) {
      allResources = allResources.concat(res.resources);
    }
    nextCursor = res.next_cursor;
  } while (nextCursor);

  console.log(`Found total ${allResources.length} assets in Cloudinary under "aspier".`);

  // 4. Determine which assets to delete
  // Assets to delete:
  // - Old temp uploads in aspier/ (e.g. aspier/spowluv4clf2cqfvtv2f) that were copied to aspier/wings/wing-*
  // - Any assets in aspier/wings/ that are NOT one of aspier/wings/wing-1 .. wing-10
  // - Any asset NOT in activePublicIds, except recently uploaded (< 1 hour ago) or general assets
  const toDelete: string[] = [];
  const toKeep: string[] = [];

  for (const r of allResources) {
    const pid = r.public_id;
    if (CANONICAL_WING_PUBLIC_IDS.has(pid)) {
      toKeep.push(pid);
      continue;
    }

    // In aspier/wings/ but not canonical wing-1..10 -> definitely redundant duplicate!
    if (pid.startsWith('aspier/wings/')) {
      console.log(`[Delete Candidate] Redundant wing asset: ${pid}`);
      toDelete.push(pid);
      continue;
    }

    // Direct children of aspier/ with random hashes that were temp wing uploads
    const tempWingUploads = [
      'aspier/spowluv4clf2cqfvtv2f',
      'aspier/ts5y5rhrjod9cam79wjd',
      'aspier/aj8yrhtlyqovhpopnylk',
      'aspier/n7cxjdrmrtic8b923czo',
      'aspier/me4wwleqzyjzqwfnbatr',
      'aspier/u2vr2xjqdy85mfvxwwnv',
      'aspier/ntyfojqvyuadpv0pscm7',
      'aspier/er7pg3kaztwriya17akx',
      'aspier/hu6loyplhzupzbmgbxoe',
      'aspier/d8k5bjtg4yeh1sapbbxc'
    ];

    if (tempWingUploads.includes(pid)) {
      console.log(`[Delete Candidate] Temp source wing upload now deduplicated: ${pid}`);
      toDelete.push(pid);
      continue;
    }

    if (activePublicIds.has(pid)) {
      toKeep.push(pid);
      continue;
    }

    // Keep other assets (team, research, etc.) if not explicitly obsolete
    toKeep.push(pid);
  }

  console.log(`\n--- Deduplication Plan ---`);
  console.log(`Total to KEEP: ${toKeep.length}`);
  console.log(`Total to DELETE: ${toDelete.length}`);

  if (toDelete.length > 0) {
    console.log('\nExecuting deletion of redundant duplicate assets...');
    // Delete in batches of 100
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      const delRes = await cloudinary.api.delete_resources(batch);
      console.log(`Batch ${i / 100 + 1} deleted:`, delRes);
    }
  }

  // Also clean up MediaAsset documents in MongoDB that referenced deleted publicIds
  if (toDelete.length > 0) {
    try {
      const removedDocs = await MediaAsset.deleteMany({ publicId: { $in: toDelete } });
      console.log(`Cleaned up ${removedDocs.deletedCount} MediaAsset records in MongoDB.`);
    } catch (e) {
      console.warn('MediaAsset cleanup warning:', e);
    }
  }

  console.log('\n=== Deduplication & Wings Sync Completed Successfully! ===');
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error during deduplication:', err);
  process.exit(1);
});
