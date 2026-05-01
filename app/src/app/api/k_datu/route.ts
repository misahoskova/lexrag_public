export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { fetchKDatumu } from '@/lib/queries/establishment';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const d = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const limit = Number(url.searchParams.get('limit') ?? 20);
  return NextResponse.json({ results: await fetchKDatumu(d, limit) });
}
