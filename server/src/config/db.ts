import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';

mongoose.set('bufferCommands', true);
let memoryServer: MongoMemoryServer | undefined;

declare global {
  var _mongoosePromise: Promise<typeof mongoose> | undefined;
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectDatabase(): Promise<typeof mongoose | undefined> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (global._mongoosePromise) {
    try {
      await global._mongoosePromise;
      if ((mongoose.connection.readyState as number) === 1) {
        return mongoose;
      }
    } catch {
      global._mongoosePromise = undefined;
      global._mongooseConn = undefined;
    }
  }

  const uri = env.MONGO_URI.trim();
  if (!uri && process.env.VERCEL === '1') {
    console.warn('[db] MONGO_URI is not configured in Vercel environment. Public endpoints will serve resilient fallback catalog.');
    return;
  }

  if (!uri && env.NODE_ENV === 'development') {
    if (!memoryServer) memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();
    global._mongoosePromise = mongoose.connect(memUri, {
      bufferCommands: true,
      serverSelectionTimeoutMS: 10000
    });
    global._mongooseConn = global._mongoosePromise;
    await global._mongoosePromise;
    console.log(`[db] in-memory database connected (${mongoose.connection.host})`);
    return mongoose;
  }

  if (!uri) return;

  try {
    global._mongoosePromise = mongoose.connect(uri, {
      bufferCommands: true,
      serverSelectionTimeoutMS: 10000
    });
    global._mongooseConn = global._mongoosePromise;
    await global._mongoosePromise;
    console.log(`[db] connected (${mongoose.connection.host})`);
    return mongoose;
  } catch (error) {
    global._mongoosePromise = undefined;
    global._mongooseConn = undefined;
    if (env.NODE_ENV === 'development') {
      console.warn('[db] MONGO_URI unreachable; starting in-memory MongoDB');
      await mongoose.disconnect().catch(() => {});
      if (!memoryServer) memoryServer = await MongoMemoryServer.create();
      global._mongoosePromise = mongoose.connect(memoryServer.getUri(), {
        bufferCommands: true,
        serverSelectionTimeoutMS: 10000
      });
      global._mongooseConn = global._mongoosePromise;
      await global._mongoosePromise;
      return mongoose;
    } else {
      console.warn('[db] Database connection warning:', error instanceof Error ? error.message : error);
    }
  }
}
