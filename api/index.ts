import type { Request, Response } from 'express';

let appInstance: any = null;
let dbPromise: Promise<void> | null = null;
let seedPromise: Promise<void> | null = null;

async function getApp(): Promise<any> {
  if (!appInstance) {
    const [appMod, dbMod, seedMod] = await Promise.all([
      import('../server/dist/app.js'),
      import('../server/dist/config/db.js'),
      import('../server/dist/utils/seed.js')
    ]);
    appInstance = appMod.app;

    if (!dbPromise) {
      dbPromise = dbMod.connectDatabase().catch((err: unknown) => {
        dbPromise = null;
        console.warn('[api] connectDatabase error:', err instanceof Error ? err.message : err);
      });
    }

    if (!seedPromise) {
      seedPromise = (async () => {
        try {
          await dbPromise;
          await seedMod.seedDatabase();
        } catch (err: unknown) {
          seedPromise = null;
          console.warn('[api] seedDatabase error:', err instanceof Error ? err.message : err);
        }
      })();
    }
  }
  return appInstance;
}

export const maxDuration = 30;

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const app = await getApp();

    const requestUrl = new URL(req.url || '/', 'http://localhost');
    const apiPath = requestUrl.searchParams.get('path');
    if (!apiPath || !apiPath.startsWith('v1/')) {
      res.status(404).json({ success: false, message: 'API route not found' });
      return;
    }
    requestUrl.searchParams.delete('path');
    req.url = `/api/${apiPath}${requestUrl.search}`;
    app(req, res);
  } catch (error: any) {
    console.error('[api] Serverless handler error:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Serverless function execution error'
    });
  }
}
