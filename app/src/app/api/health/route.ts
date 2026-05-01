export const runtime = 'nodejs';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
export async function GET() {
  await db.execute(sql`select 1`);
  return Response.json({ ok: true });
}
