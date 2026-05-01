import fs from 'fs';
import path from 'path';
import process from 'process';
import * as dotenv from 'dotenv';

export function findNearestEnvLocal(startDir: string, maxUp = 6): string | null {
  let dir = startDir;
  for (let i = 0; i < maxUp; i++) {
    const p = path.join(dir, '.env.local');
    if (fs.existsSync(p)) return p;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function loadEnv(startDir: string) {
  const envPath = findNearestEnvLocal(startDir);
  dotenv.config({ path: envPath ?? undefined });
  const ok =
    !!process.env.DATABASE_URL ||
    (process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE && process.env.PGPASSWORD);

  if (!ok) {
    throw new Error('DB credentials not set in .env.local or environment variables');
  }
}
