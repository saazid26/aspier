import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';
let memoryServer: MongoMemoryServer | undefined;
declare global {
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectDatabase(): Promise<void> {
  let uri = env.MONGO_URI.trim();
  if (!uri && process.env.VERCEL === '1') {
    throw new Error('[db] MONGO_URI is required in production');
  }
  if (!uri && env.NODE_ENV === 'development') {
    if (!memoryServer) memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }
  try {
    if (!global._mongooseConn) {
      global._mongooseConn = mongoose.connect(uri, { bufferCommands: false });
    }
    await global._mongooseConn;
  } catch (error) {
    if (env.NODE_ENV === 'development') {
      console.warn('[db] MONGO_URI unreachable; starting in-memory MongoDB');
      await mongoose.disconnect();
      if (!memoryServer) memoryServer = await MongoMemoryServer.create();
      global._mongooseConn = mongoose.connect(memoryServer.getUri(), { bufferCommands: false });
      await global._mongooseConn;
    } else {
      throw error;
    }
  }
  console.log(`[db] connected (${mongoose.connection.host})`);
}

