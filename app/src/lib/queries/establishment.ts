import { db } from '@/lib/db';
import { unitChunk } from '@/db/schema';
import { sql, and, lte, or, isNull, gte, desc, eq } from 'drizzle-orm';

export type UstanoveniResult = {
  id: string;
  paragraf_cislo: string;
  paragraf_path: string;
  text_zacatek: string;
};

export async function fetchKDatumu(date: string, limit: number = 20) {
  const dateToCheck = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      id: unitChunk.id,
      textWithContext: unitChunk.textWithContext,
      label: unitChunk.label,
      marker: unitChunk.marker,
    })
    .from(unitChunk)
    .where(
      and(
        lte(unitChunk.validFrom, dateToCheck),
        or(isNull(unitChunk.validTo), gte(unitChunk.validTo, dateToCheck)),
        sql`length(${unitChunk.textWithContext}) > 0`,
      ),
    )
    .orderBy(sql`RANDOM()`)
    .limit(limit);
  return rows.map(r => {
    const parts = (r.textWithContext || '').split(/\s*>\s*/);
    let text_zacatek = '';
    let paragraf_path = '';
    let paragraf_cislo = '';

    if (parts.length > 1) {
      text_zacatek = parts.pop() || '';
      paragraf_path = parts.join(' > ');

      const match = paragraf_path.match(/§\s*\d+[a-z]*/);
      paragraf_cislo = match ? match[0] : r.label || 'Ustanovení';
    } else {
      text_zacatek = r.textWithContext || '';
      paragraf_cislo = r.label || 'Ustanovení';
    }

    text_zacatek = text_zacatek.substring(0, 150) + (text_zacatek.length > 150 ? '...' : '');

    return {
      id: r.id,
      paragraf_cislo,
      paragraf_path,
      text_zacatek,
    };
  });
}
