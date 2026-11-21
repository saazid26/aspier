import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';
let memoryServer: MongoMemoryServer | undefined;
declare global {
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectDatabase(): Promise<void> {
  const uri = env.MONGO_URI.trim();
  if (!uri && process.env.VERCEL === '1') {
    console.warn('[db] MONGO_URI is not configured in Vercel environment. Public endpoints will serve resilient fallback catalog.');
    return;
  }
  if (!uri && env.NODE_ENV === 'development') {
    if (!memoryServer) memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();
    if (!global._mongooseConn) {
      global._mongooseConn = mongoose.connect(memUri, { bufferCommands: false });
    }
    await global._mongooseConn;
    console.log(`[db] in-memory database connected (${mongoose.connection.host})`);
    return;
  }
  if (!uri) return;

  try {
    if (!global._mongooseConn) {
      global._mongooseConn = mongoose.connect(uri, { bufferCommands: false });
    }
    await global._mongooseConn;
    console.log(`[db] connected (${mongoose.connection.host})`);
  } catch (error) {
    if (env.NODE_ENV === 'development') {
      console.warn('[db] MONGO_URI unreachable; starting in-memory MongoDB');
      await mongoose.disconnect();
      if (!memoryServer) memoryServer = await MongoMemoryServer.create();
      global._mongooseConn = mongoose.connect(memoryServer.getUri(), { bufferCommands: false });
      await global._mongooseConn;
    } else {
      console.warn('[db] Database connection warning:', error instanceof Error ? error.message : error);
    }
  }
}
