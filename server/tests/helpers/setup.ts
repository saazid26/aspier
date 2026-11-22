import { beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

let server: MongoMemoryServer | undefined;
const tempRoot = path.resolve(process.cwd(), '../.temp_mongod');
const suiteDir = path.join(tempRoot, randomUUID());

beforeAll(async () => {
  fs.mkdirSync(suiteDir, { recursive: true });
  server = await MongoMemoryServer.create({
    instance: {
      dbPath: suiteDir,
      tmpDir: suiteDir,
      launchTimeout: 30000
    }
  });
  await mongoose.connect(server.getUri());
});

afterEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
  try {
    fs.rmSync(suiteDir, { recursive: true, force: true });
  } catch {}
});
