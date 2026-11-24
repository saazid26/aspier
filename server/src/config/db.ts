import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';

mongoose.set('strictQuery', true);
mongoose.set('bufferCommands', true);

let memoryServer: MongoMemoryServer | undefined;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose | undefined> | null;
}

declare global {
  var __mongooseCache: MongooseCache | undefined;
}

if (!global.__mongooseCache) {
  global.__mongooseCache = { conn: null, promise: null };
}

async function connectWithRetry(uri: string, maxAttempts = 3): Promise<typeof mongoose> {
  let attempt = 0;
  let delay = 1000;
  while (attempt < maxAttempts) {
    try {
      attempt++;
      return await mongoose.connect(uri, {
        bufferCommands: true,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 20,
        minPoolSize: 2,
        socketTimeoutMS: 20000,
        connectTimeoutMS: 10000,
        family: 4
      });
    } catch (error) {
      console.warn(`[db] MongoDB connection attempt ${attempt}/${maxAttempts} failed: ${error instanceof Error ? error.message : error}`);
      if (attempt >= maxAttempts) {
        throw error;
      }
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2;
    }
  }
  throw new Error('Failed to connect to MongoDB after maximum retry attempts');
}

export async function connectDatabase(): Promise<typeof mongoose | undefined> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (global.__mongooseCache?.promise) {
    try {
      await global.__mongooseCache.promise;
      if ((mongoose.connection.readyState as number) === 1) {
        return mongoose;
      }
    } catch {
      if (global.__mongooseCache) {
        global.__mongooseCache.promise = null;
        global.__mongooseCache.conn = null;
      }
    }
  }

  const uri = env.MONGO_URI ? env.MONGO_URI.trim() : '';

  if (!uri && process.env.VERCEL === '1') {
    console.warn('[db] MONGO_URI is not configured in Vercel environment. Public endpoints will serve resilient fallback catalog.');
    return;
  }

  if (!uri && env.NODE_ENV === 'development') {
    if (!memoryServer) memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();
    const promise = mongoose.connect(memUri, {
      bufferCommands: true,
      serverSelectionTimeoutMS: 10000
    });
    if (global.__mongooseCache) {
      global.__mongooseCache.promise = promise as any;
    }
    await promise;
    if (global.__mongooseCache) {
      global.__mongooseCache.conn = mongoose;
    }
    console.log(`[db] in-memory database connected (${mongoose.connection.host})`);
    return mongoose;
  }

  if (!uri) return;

  try {
    const promise = connectWithRetry(uri, 3);
    if (global.__mongooseCache) {
      global.__mongooseCache.promise = promise as any;
    }
    const conn = await promise;
    if (global.__mongooseCache) {
      global.__mongooseCache.conn = conn;
    }
    console.log(`[db] connected (${mongoose.connection.host})`);
    return mongoose;
  } catch (error) {
    if (global.__mongooseCache) {
      global.__mongooseCache.promise = null;
      global.__mongooseCache.conn = null;
    }
    if (env.NODE_ENV === 'development') {
      console.warn('[db] MONGO_URI unreachable; falling back to in-memory MongoDB');
      await mongoose.disconnect().catch(() => {});
      if (!memoryServer) memoryServer = await MongoMemoryServer.create();
      const memPromise = mongoose.connect(memoryServer.getUri(), {
        bufferCommands: true,
        serverSelectionTimeoutMS: 10000
      });
      if (global.__mongooseCache) {
        global.__mongooseCache.promise = memPromise as any;
      }
      await memPromise;
      if (global.__mongooseCache) {
        global.__mongooseCache.conn = mongoose;
      }
      return mongoose;
    } else {
      console.warn('[db] Database connection warning:', error instanceof Error ? error.message : error);
    }
  }
}

export const connectDB = connectDatabase;
