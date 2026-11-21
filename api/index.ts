import type { Request, Response } from 'express';
import { app } from '../server/dist/app.js';
import { connectDatabase } from '../server/dist/config/db.js';
import { seedDatabase } from '../server/dist/utils/seed.js';

let databaseConnection: Promise<void> | undefined;
let seedPromise: Promise<void> | undefined;

async function ensureDatabaseConnection(): Promise<void> {
  if (!databaseConnection) {
    databaseConnection = connectDatabase().catch((error: unknown) => {
      databaseConnection = undefined;
      throw error;
    });
  }
  await databaseConnection;
  if (!seedPromise) {
    seedPromise = seedDatabase().catch((error: unknown) => {
      seedPromise = undefined;
      throw error;
    });
  }
  await seedPromise;
}

export const maxDuration = 30;

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    await ensureDatabaseConnection();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database unavailable';
    res.status(process.env.VERCEL === '1' && message.includes('MONGO_URI') ? 503 : 500).json({
      success: false,
      message,
      code: 'DATABASE_UNAVAILABLE'
    });
    return;
  }
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const apiPath = requestUrl.searchParams.get('path');
  if (!apiPath || !apiPath.startsWith('v1/')) {
    res.status(404).json({ success: false, message: 'API route not found' });
    return;
  }
  requestUrl.searchParams.delete('path');
  req.url = `/api/${apiPath}${requestUrl.search}`;
  app(req, res);
}
