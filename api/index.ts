import type { Request, Response } from 'express';

let appInstance: any = null;

async function getApp(): Promise<any> {
  if (!appInstance) {
    const [appMod, dbMod, seedMod] = await Promise.all([
      import('../server/dist/app.js'),
      import('../server/dist/config/db.js'),
      import('../server/dist/utils/seed.js')
    ]);
    appInstance = {
      app: appMod.app,
      connectDatabase: dbMod.connectDatabase,
      ensureSeeded: seedMod.ensureSeeded || seedMod.seedDatabase
    };
  }
  return appInstance;
}

export const maxDuration = 30;

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const { app, connectDatabase, ensureSeeded } = await getApp();

    // Guarantee database connection and seeded admin on cold starts
    if (connectDatabase) {
      await Promise.race([
        connectDatabase(),
        new Promise((resolve) => setTimeout(resolve, 3000))
      ]).catch((err: unknown) => {
        console.warn('[api] connectDatabase error:', err instanceof Error ? err.message : err);
      });
    }

    if (ensureSeeded) {
      if (req.method === 'GET') {
        ensureSeeded().catch((err: unknown) => {
          console.warn('[api] background ensureSeeded error:', err instanceof Error ? err.message : err);
        });
      } else {
        await Promise.race([
          ensureSeeded(),
          new Promise((resolve) => setTimeout(resolve, 2500))
        ]).catch(() => {});
      }
    }

    const requestUrl = new URL(req.url || '/', 'http://localhost');
    let apiPath = requestUrl.searchParams.get('path');
    if (!apiPath && req.url?.startsWith('/api/')) {
      apiPath = req.url.slice('/api/'.length).split('?')[0];
    }
    if (apiPath && !apiPath.startsWith('v1/')) {
      apiPath = `v1/${apiPath}`;
    }
    if (!apiPath || !apiPath.startsWith('v1/')) {
      res.status(404).json({ success: false, message: 'API route not found' });
      return;
    }
    requestUrl.searchParams.delete('path');
    req.url = `/api/${apiPath}${requestUrl.search}`;
    
    return new Promise<void>((resolve, reject) => {
      res.on('finish', () => resolve());
      res.on('close', () => resolve());
      try {
        app(req, res, (err: unknown) => {
          if (err) reject(err);
          else resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  } catch (error: any) {
    console.error('[api] Serverless handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error?.message || 'Serverless function execution error'
      });
    }
  }
}
