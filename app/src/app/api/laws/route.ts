import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { zakon } from '@/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const allLaws = await db
      .select({
        id: zakon.id,
        cislo: zakon.cislo,
        rok: zakon.rok,
        nazev: zakon.nazev,
        zkratka: zakon.zkratka,
      })
      .from(zakon)
      .orderBy(asc(zakon.rok), asc(zakon.cislo));

    return NextResponse.json({ laws: allLaws });
  } catch (error) {
    console.error('Chyba při načítání zákonů:', error);
    return NextResponse.json({ error: 'Failed to fetch laws' }, { status: 500 });
  }
}
