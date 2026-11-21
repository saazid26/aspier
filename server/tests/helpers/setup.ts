import { beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
let server: MongoMemoryServer | undefined;
beforeAll(async () => { server = await MongoMemoryServer.create({ instance: { launchTimeout: 30000 } }); await mongoose.connect(server.getUri()); });
afterEach(async () => { await mongoose.connection.db?.dropDatabase(); });
afterAll(async () => { await mongoose.disconnect(); await server?.stop(); });
