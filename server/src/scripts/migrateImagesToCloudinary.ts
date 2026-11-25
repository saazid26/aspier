import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { migrateAllImagesToCloudinary } from '../services/migration.service.js';

async function main() {
  console.log('--- Starting Cloudinary Image Migration Script ---');
  try {
    const report = await migrateAllImagesToCloudinary();
    console.log('--- Migration Report ---');
    console.log(JSON.stringify(report, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed with critical error:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

main();
