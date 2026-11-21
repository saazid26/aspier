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
      console.warn('[api] Database connection note:', error instanceof Error ? error.message : error);
    });
  }
  await databaseConnection;
  if (!seedPromise) {
    seedPromise = seedDatabase().catch((error: unknown) => {
      seedPromise = undefined;
      console.warn('[api] Seed database note:', error instanceof Error ? error.message : error);
    });
  }
}

export const maxDuration = 30;

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    await ensureDatabaseConnection();
  } catch (error) {
    console.warn('[api] ensureDatabaseConnection note:', error instanceof Error ? error.message : error);
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
