import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { seedDatabase } from './utils/seed.js';
async function start() {
  await connectDatabase();
  await seedDatabase();
  app.listen(env.PORT, () => console.log(`[server] ASPIER listening at http://localhost:${env.PORT}`));
}
if (process.env.VERCEL !== '1') {
  start().catch((error) => { console.error('[server] startup failed', error); process.exit(1); });
}
