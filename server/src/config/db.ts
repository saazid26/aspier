import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';

mongoose.set('strictQuery', true);
mongoose.set('bufferCommands', false);

let memoryServer: MongoMemoryServer | undefined;

export interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __mongooseCache: MongooseCache | undefined;
}

if (!global.__mongooseCache) {
  global.__mongooseCache = { conn: null, promise: null };
}

export function getMongoUri(): string {
  return (
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    env.MONGO_URI ||
    ''
  ).trim();
}

export class DatabaseError extends Error {
  status: number;
  detail?: string;
  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export async function connectDB(): Promise<typeof mongoose> {
  // If already connected, return cached mongoose instance immediately
  if (mongoose.connection.readyState === 1) {
    if (global.__mongooseCache) {
      global.__mongooseCache.conn = mongoose;
    }
    return mongoose;
  }

  // If a connection promise is already in flight, await it
  if (global.__mongooseCache?.promise) {
    try {
      const conn = await global.__mongooseCache.promise;
      if ((mongoose.connection.readyState as number) === 1) {
        return conn;
      }
    } catch {
      if (global.__mongooseCache) {
        global.__mongooseCache.promise = null;
        global.__mongooseCache.conn = null;
      }
    }
  }

  const uri = getMongoUri();

  // Handle missing URI in environment variables
  if (!uri) {
    if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      if (!memoryServer) memoryServer = await MongoMemoryServer.create();
      const memUri = memoryServer.getUri();
      const promise = mongoose.connect(memUri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 10,
        family: 4
      });
      if (global.__mongooseCache) {
        global.__mongooseCache.promise = promise;
      }
      const conn = await promise;
      if (global.__mongooseCache) {
        global.__mongooseCache.conn = conn;
      }
      console.log(`[db] in-memory database connected (${mongoose.connection.host})`);
      return conn;
    }

    throw new DatabaseError(
      503,
      'Database configuration missing: set MONGO_URI in Vercel Environment Variables.'
    );
  }

  // Connect to configured MongoDB URI
  const connectPromise = (async () => {
    try {
      const conn = await mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 20000,
        connectTimeoutMS: 8000,
        family: 4,
        bufferCommands: false
      });
      console.log(`[db] connected (${mongoose.connection.host})`);
      return conn;
    } catch (err: any) {
      if (global.__mongooseCache) {
        global.__mongooseCache.promise = null;
        global.__mongooseCache.conn = null;
      }
      if (env.NODE_ENV === 'development') {
        console.warn('[db] MONGO_URI unreachable; falling back to in-memory MongoDB');
        await mongoose.disconnect().catch(() => {});
        if (!memoryServer) memoryServer = await MongoMemoryServer.create();
        const memConn = await mongoose.connect(memoryServer.getUri(), {
          bufferCommands: false,
          serverSelectionTimeoutMS: 8000,
          maxPoolSize: 10,
          family: 4
        });
        if (global.__mongooseCache) {
          global.__mongooseCache.conn = memConn;
        }
        return memConn;
      }
      throw new DatabaseError(
        503,
        'Database connection failed. Verify MongoDB Atlas Network Access (0.0.0.0/0) and credentials.',
        err instanceof Error ? err.message : String(err)
      );
    }
  })();

  if (global.__mongooseCache) {
    global.__mongooseCache.promise = connectPromise;
  }

  try {
    const conn = await connectPromise;
    if (global.__mongooseCache) {
      global.__mongooseCache.conn = conn;
    }
    return conn;
  } catch (err) {
    if (global.__mongooseCache) {
      global.__mongooseCache.promise = null;
      global.__mongooseCache.conn = null;
    }
    throw err;
  }
}

export const connectDatabase = connectDB;
