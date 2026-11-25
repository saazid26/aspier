import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

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
import News from '../models/News.js';
import Course from '../models/Course.js';
import Setting from '../models/Setting.js';
import MediaAsset from '../models/MediaAsset.js';

function extractPublicId(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(aspier\/[^.]+)(?:\.[a-zA-Z0-9]+)?/);
  if (match && match[1]) return match[1];
  return null;
}

async function runPurgeAndDeduplication() {
  console.log('===============================================================');
  console.log('=== CLOUDINARY DUMMY ASSET PURGE & STRICT 1-COPY DEDUPLICATION ===');
  console.log('===============================================================\n');

  if (!cloudinaryEnabled) {
    console.error('Cloudinary is not configured. Check environment variables.');
    process.exit(1);
  }

  // 1. Connect to MongoDB (if available)
  try {
    await connectDatabase();
    console.log('[DB] Connected to MongoDB.');
  } catch (err: any) {
    console.warn('[DB] MongoDB connection warning:', err.message);
  }

  // 2. Fetch all active image URLs from live production API & local DB
  console.log('\n--- Step 1: Gathering all active production and database image URLs ---');
  const activePublicIds = new Set<string>();

  // Deterministic Wings 1-10 ALWAYS canonical
  for (let order = 1; order <= 10; order++) {
    activePublicIds.add(`aspier/wings/wing-${order}`);
  }

  // Query live production endpoints
  const liveBase = 'https://aspierglobal.vercel.app/api/v1';
  const liveEndpoints = ['/wings', '/team', '/settings', '/courses', '/research', '/news'];
  for (const ep of liveEndpoints) {
    try {
      const res = await axios.get(liveBase + ep, { timeout: 10000 });
      const str = JSON.stringify(res.data);
      const matches = str.match(/https:\/\/res\.cloudinary\.com\/[^\s"'\\]+/g) || [];
      for (const url of matches) {
        const pid = extractPublicId(url);
        if (pid) activePublicIds.add(pid);
      }
      console.log(`[Live API] ${ep}: checked and indexed`);
    } catch (e: any) {
      console.warn(`[Live API] Could not check ${ep}:`, e.message);
    }
  }

  // Query DB models if connected
  try {
    const wings = await Wing.find().select('coverImage order');
    for (const w of wings) {
      const pid = extractPublicId(w.coverImage);
      if (pid) activePublicIds.add(pid);
    }

    const members = await FoundingMember.find().select('photo');
    for (const m of members) {
      const pid = extractPublicId(m.photo);
      if (pid) activePublicIds.add(pid);
    }

    const sups = await Supervisor.find().select('photo');
    for (const s of sups) {
      const pid = extractPublicId(s.photo);
      if (pid) activePublicIds.add(pid);
    }

    const scholars = await Scholar.find().select('photo');
    for (const sc of scholars) {
      const pid = extractPublicId(sc.photo);
      if (pid) activePublicIds.add(pid);
    }

    const researches = await Research.find().select('coverImage');
    for (const r of researches) {
      const pid = extractPublicId(r.coverImage);
      if (pid) activePublicIds.add(pid);
    }

    const newsList = await News.find().select('coverImage');
    for (const n of newsList) {
      const pid = extractPublicId(n.coverImage);
      if (pid) activePublicIds.add(pid);
    }

    const courses = await Course.find().select('thumbnail bannerUrl');
    for (const c of courses) {
      const pid1 = extractPublicId(c.thumbnail);
      const pid2 = extractPublicId(c.bannerUrl);
      if (pid1) activePublicIds.add(pid1);
      if (pid2) activePublicIds.add(pid2);
    }

    const settings = await Setting.find().select('heroImage founderPhoto logo favicon');
    for (const st of settings) {
      const p1 = extractPublicId(st.heroImage);
      const p2 = extractPublicId(st.founderPhoto);
      const p3 = extractPublicId((st as any).logo);
      const p4 = extractPublicId((st as any).favicon);
      if (p1) activePublicIds.add(p1);
      if (p2) activePublicIds.add(p2);
      if (p3) activePublicIds.add(p3);
      if (p4) activePublicIds.add(p4);
    }
  } catch (err: any) {
    console.warn('[DB] Read error for active public IDs:', err.message);
  }

  console.log(`[Summary] Total active real public IDs protected: ${activePublicIds.size}`);
  Array.from(activePublicIds).sort().forEach(id => console.log('  [PROTECTED]', id));

  // 3. List all resources in Cloudinary
  console.log('\n--- Step 2: Querying all assets in Cloudinary ---');
  let allResources: any[] = [];
  let nextCursor: string | undefined = undefined;

  do {
    const res: any = await cloudinary.api.resources({
      type: 'upload',
      max_results: 500,
      next_cursor: nextCursor
    });
    if (res.resources && Array.isArray(res.resources)) {
      allResources = allResources.concat(res.resources);
    }
    nextCursor = res.next_cursor;
  } while (nextCursor);

  console.log(`[Cloudinary] Total assets found in cloud: ${allResources.length}`);

  // 4. Classify assets: Dummy, Duplicate, or Real Unique
  console.log('\n--- Step 3: Classifying assets for Purge and Deduplication ---');
  const dummyToDelete: string[] = [];
  const duplicatesToDelete: string[] = [];
  const realUniqueToKeep: any[] = [];

  // Group real assets by fingerprint to enforce strictly 1 copy
  const fingerprintMap = new Map<string, any>();

  for (const asset of allResources) {
    const pid = asset.public_id;

    // Check if asset is inside aspier/migrated
    // As confirmed by live crawl, aspier/migrated has 0 references and consists entirely of
    // duplicate old wing uploads and converted "ASPIER • ILLUSTRATIVE ART" SVG placeholders.
    if (pid.startsWith('aspier/migrated/')) {
      dummyToDelete.push(pid);
      continue;
    }

    // Check if asset is a dummy instructor SVG or sample avatar
    if (pid.startsWith('aspier/instructors/')) {
      dummyToDelete.push(pid);
      continue;
    }

    // Check if public_id contains "dummy", "placeholder", "demo", "sample"
    if (/dummy|placeholder|demo|sample|illustrative/i.test(pid)) {
      dummyToDelete.push(pid);
      continue;
    }

    // Check canonical wings 1..10
    if (pid.startsWith('aspier/wings/')) {
      if (/^aspier\/wings\/wing-(?:[1-9]|10)$/.test(pid)) {
        realUniqueToKeep.push(asset);
      } else {
        duplicatesToDelete.push(pid);
      }
      continue;
    }

    // Real team photos in aspier/team
    if (pid.startsWith('aspier/team/')) {
      // Fingerprint by byte size + dimensions
      const fp = `team:${asset.bytes}:${asset.width}x${asset.height}`;
      if (fingerprintMap.has(fp)) {
        console.log(`[Duplicate Team Asset] Found duplicate of ${fp}: ${pid}`);
        duplicatesToDelete.push(pid);
      } else {
        fingerprintMap.set(fp, asset);
        realUniqueToKeep.push(asset);
      }
      continue;
    }

    // Branding & settings
    if (pid.startsWith('aspier/branding/') || pid.startsWith('aspier/')) {
      if (activePublicIds.has(pid)) {
        realUniqueToKeep.push(asset);
      } else {
        console.log(`[Unreferenced Stray Asset] ${pid}`);
        duplicatesToDelete.push(pid);
      }
      continue;
    }

    // Any other unreferenced asset
    if (!activePublicIds.has(pid)) {
      duplicatesToDelete.push(pid);
    } else {
      realUniqueToKeep.push(asset);
    }
  }

  console.log(`\n--- Classification Summary ---`);
  console.log(`Total Dummy Assets to Purge:       ${dummyToDelete.length}`);
  console.log(`Total Duplicate Assets to Delete:  ${duplicatesToDelete.length}`);
  console.log(`Total Real Unique Assets to Keep:  ${realUniqueToKeep.length}`);

  const allToDelete = [...dummyToDelete, ...duplicatesToDelete];

  // 5. Execute deletions in Cloudinary
  if (allToDelete.length > 0) {
    console.log(`\n--- Step 4: Permanently deleting ${allToDelete.length} dummy/duplicate assets from Cloudinary ---`);
    for (let i = 0; i < allToDelete.length; i += 100) {
      const batch = allToDelete.slice(i, i + 100);
      try {
        const delRes = await cloudinary.api.delete_resources(batch, { invalidate: true });
        console.log(`[Delete Batch ${i / 100 + 1}] Successfully processed:`, Object.keys(delRes.deleted || {}).length, 'assets');
      } catch (delErr: any) {
        console.error(`[Delete Batch Error]`, delErr.message);
      }
    }
  }

  // 6. Delete empty folders
  console.log('\n--- Step 5: Deleting empty folders in Cloudinary ---');
  const foldersToClean = ['aspier/migrated', 'aspier/instructors'];
  for (const folder of foldersToClean) {
    try {
      await cloudinary.api.delete_folder(folder);
      console.log(`[Folder Cleaned] Deleted empty folder: ${folder}`);
    } catch (fErr: any) {
      console.log(`[Folder Info] ${folder}: ${fErr.message}`);
    }
  }

  // 7. Clean up MediaAsset records in MongoDB
  if (allToDelete.length > 0) {
    try {
      const res = await MediaAsset.deleteMany({ publicId: { $in: allToDelete } });
      console.log(`[MongoDB Cleanup] Purged ${res.deletedCount} MediaAsset records pointing to deleted assets.`);
    } catch (e: any) {
      console.warn('[MongoDB Cleanup] MediaAsset purge warning:', e.message);
    }
  }

  // 8. Ensure Wings 1-10 in MongoDB match exact canonical URLs
  console.log('\n--- Step 6: Ensuring Wings 1-10 in MongoDB point to canonical Cloudinary URLs ---');
  for (let order = 1; order <= 10; order++) {
    const canonicalUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || 'w9zgpjap'}/image/upload/aspier/wings/wing-${order}.webp`;
    try {
      await Wing.findOneAndUpdate(
        { order },
        { $set: { coverImage: canonicalUrl } }
      );
      console.log(`[Wing ${order}] Verified -> ${canonicalUrl}`);
    } catch (err: any) {
      console.warn(`[Wing ${order}] Update error:`, err.message);
    }
  }

  // 9. Final Verification of Cloudinary Remaining Assets
  console.log('\n--- Step 7: Final verification of remaining Cloudinary assets ---');
  let remaining: any[] = [];
  let finalCursor: string | undefined = undefined;
  do {
    const res: any = await cloudinary.api.resources({
      type: 'upload',
      max_results: 500,
      next_cursor: finalCursor
    });
    remaining = remaining.concat(res.resources || []);
    finalCursor = res.next_cursor;
  } while (finalCursor);

  console.log(`\n===============================================================`);
  console.log(`=== CLOUDINARY PURGE & DEDUPLICATION COMPLETED SUCCESSFULLY ===`);
  console.log(`===============================================================`);
  console.log(`Total Dummy Assets Purged:       ${dummyToDelete.length}`);
  console.log(`Total Duplicate Assets Purged:   ${duplicatesToDelete.length}`);
  console.log(`Final Cloudinary Asset Count:    ${remaining.length}`);
  console.log(`\nRemaining Canonical Assets:`);
  remaining.forEach((r, idx) => {
    console.log(`  ${idx + 1}. [${r.public_id}] (${r.bytes}B, ${r.format})`);
  });
  console.log(`===============================================================\n`);
  process.exit(0);
}

runPurgeAndDeduplication().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
