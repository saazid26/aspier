import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js';

async function main() {
  console.log('=== Starting Cloudinary Dummy Purge & Strict Deduplication ===');
  if (!cloudinaryEnabled) {
    console.error('Cloudinary is not enabled. Check credentials.');
    process.exit(1);
  }

  // 1. Fetch all assets from Cloudinary
  console.log('\nFetching all upload resources from Cloudinary...');
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

  console.log(`Total upload assets in Cloudinary: ${allResources.length}`);

  const dummyToDelete = new Set<string>();
  const duplicateToDelete = new Set<string>();
  const toKeep = new Set<string>();

  // 2. Identify all dummy / placeholder / sample graphics
  for (const r of allResources) {
    const pid = r.public_id;

    // A. Dummy SVG graphics (ASPIER • ILLUSTRATIVE ART or sample avatars)
    if (
      pid.startsWith('aspier/research/') ||
      pid.startsWith('aspier/courses/') ||
      pid.startsWith('aspier/news/') ||
      pid.startsWith('aspier/instructors/') ||
      pid.startsWith('aspier/test/') ||
      (r.format === 'svg' && pid.startsWith('aspier/'))
    ) {
      dummyToDelete.add(pid);
      continue;
    }

    // B. Blank 1x1 dummy pixels
    if (r.width === 1 && r.height === 1) {
      dummyToDelete.add(pid);
      continue;
    }

    // C. Default Cloudinary samples
    if (
      pid.startsWith('samples/') ||
      pid.startsWith('cld-sample') ||
      pid === 'sample' ||
      pid === 'main-sample'
    ) {
      dummyToDelete.add(pid);
      continue;
    }

    // D. Explicit known duplicate of wing-6
    if (pid === 'aspier/zcik9fiztgqu9jpnmqj1') {
      duplicateToDelete.add(pid);
      continue;
    }
  }

  console.log(`Identified ${dummyToDelete.size} dummy / sample assets to purge.`);

  // 3. Deduplicate remaining real assets (Group by fingerprint: bytes + format + width x height)
  const realCandidates = allResources.filter(r => !dummyToDelete.has(r.public_id) && !duplicateToDelete.has(r.public_id));
  console.log(`Analyzing ${realCandidates.length} real candidates for duplicate copies...`);

  const byFingerprint: Record<string, any[]> = {};
  for (const r of realCandidates) {
    const key = `${r.bytes}_${r.format}_${r.width}x${r.height}`;
    if (!byFingerprint[key]) byFingerprint[key] = [];
    byFingerprint[key].push(r);
  }

  for (const [key, items] of Object.entries(byFingerprint)) {
    if (items.length === 1) {
      toKeep.add(items[0].public_id);
      continue;
    }

    console.log(`Duplicate group [${key}] with ${items.length} copies:`);
    items.forEach(i => console.log(`   - ${i.public_id}`));

    // Determine the single canonical copy to keep:
    // Priority:
    // 1. Canonical public IDs: aspier/wings/wing-*
    // 2. Structured folder: aspier/team/*, aspier/branding/*
    // 3. First uploaded or shortest public_id in aspier/migrated/*
    let canonical = items.find(i => i.public_id.startsWith('aspier/wings/wing-'));
    if (!canonical) {
      canonical = items.find(i => i.public_id.startsWith('aspier/team/') || i.public_id.startsWith('aspier/branding/'));
    }
    if (!canonical) {
      canonical = items[0];
    }

    console.log(`   -> KEEP canonical: ${canonical.public_id}`);
    toKeep.add(canonical.public_id);

    for (const item of items) {
      if (item.public_id !== canonical.public_id) {
        console.log(`   -> DELETE duplicate: ${item.public_id}`);
        duplicateToDelete.add(item.public_id);
      }
    }
  }

  console.log('\n--- Purge & Deduplication Summary ---');
  console.log(`Total dummy assets to delete: ${dummyToDelete.size}`);
  console.log(`Total duplicate assets to delete: ${duplicateToDelete.size}`);
  console.log(`Total unique real assets to keep: ${toKeep.size}`);

  // 4. Execute deletion in batches of 100
  const allToDelete = [...dummyToDelete, ...duplicateToDelete];
  console.log(`\nExecuting deletion of ${allToDelete.length} total assets from Cloudinary...`);

  for (let i = 0; i < allToDelete.length; i += 100) {
    const batch = allToDelete.slice(i, i + 100);
    const delRes: any = await cloudinary.api.delete_resources(batch, { invalidate: true });
    console.log(`Batch ${Math.floor(i / 100) + 1} (${batch.length} items):`, {
      deletedCount: Object.keys(delRes.deleted || {}).length
    });
  }

  // 5. Delete empty leftover folders
  const candidateFolders = [
    'aspier/research',
    'aspier/courses',
    'aspier/news',
    'aspier/instructors',
    'aspier/test',
    'samples/animals',
    'samples/landscapes',
    'samples/food',
    'samples/ecommerce',
    'samples/people',
    'samples'
  ];

  console.log('\nCleaning up empty leftover folders in Cloudinary...');
  for (const folder of candidateFolders) {
    try {
      await cloudinary.api.delete_folder(folder);
      console.log(`Deleted empty folder: ${folder}`);
    } catch (fErr: any) {
      // folder might not be empty or already gone
      // ignore
    }
  }

  // 6. Verify final state
  console.log('\n--- Final Cloudinary Resource Verification ---');
  let remaining: any[] = [];
  let nextCursor2: string | undefined = undefined;

  do {
    const res2: any = await cloudinary.api.resources({
      type: 'upload',
      max_results: 500,
      next_cursor: nextCursor2
    });

    if (res2.resources && Array.isArray(res2.resources)) {
      remaining = remaining.concat(res2.resources);
    }
    nextCursor2 = res2.next_cursor;
  } while (nextCursor2);

  console.log(`Final total assets remaining in Cloudinary: ${remaining.length}`);
  const finalFolders: Record<string, number> = {};
  for (const r of remaining) {
    const folder = r.public_id.includes('/') ? r.public_id.split('/').slice(0, -1).join('/') : '(root)';
    finalFolders[folder] = (finalFolders[folder] || 0) + 1;
    console.log(`  [${r.format} ${r.bytes}B ${r.width}x${r.height}] ${r.public_id}`);
  }
  console.log('Final counts by folder:', finalFolders);

  console.log('\n=== Cloudinary Purge & Deduplication Completed Successfully! ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during purge:', err);
  process.exit(1);
});
