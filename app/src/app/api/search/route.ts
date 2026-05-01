import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { unitChunk, unitText, unitNode } from '@/db/schema';

import { OpenAIEmbeddings } from '@langchain/openai';
import { sql, isNotNull, and, or, lte, gte, isNull, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const EMBEDDING_DIM = 1536;

const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-large',
  dimensions: EMBEDDING_DIM,
});

function toPgvectorLiteral(v: number[]): string {
  return `[${v.map(x => (Number.isFinite(x) ? x : 0)).join(',')}]`;
}

function splitTextWithContext(rawInput: string): { sourceFromText: string; content: string } {
  const raw = (rawInput ?? '').trim();
  if (!raw) return { sourceFromText: '', content: '' };

  const parts = raw.split(/\n\s*\n/);
  if (parts.length >= 2) {
    const sourceFromText = parts[0].replace(/\s+/g, ' ').trim();
    const content = parts.slice(1).join('\n\n').trim();
    return { sourceFromText, content };
  }

  const segments = raw.split(/\s*>\s*/);
  if (segments.length > 1) {
    const content = segments.pop() || '';
    const sourceFromText = segments.join(' > ');
    return { sourceFromText, content };
  }

  return { sourceFromText: '', content: raw };
}

function normalizeLawNumber(raw: string): string {
  const m = raw.match(/(\d{1,4}\/\d{4})/);
  return m ? m[1] : '';
}

function lawToPredpisId(law: string): number | null {
  const digits = (law ?? '').replace('/', '').trim();
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

type CanonRef = {
  law?: string;
  paragraf?: string;
  tail: string[];
};

function parseBreadcrumb(sourceFromText: string): CanonRef {
  const src = (sourceFromText ?? '').trim();
  const parts = src
    .split(/\s*>\s*/)
    .map(p => p.trim())
    .filter(Boolean);

  const law = parts.length ? normalizeLawNumber(parts[0]) : '';

  let paragraf = '';
  const paraIdx = parts.findIndex(p => /^§\s*\d+[a-zA-Z]*$/.test(p));
  if (paraIdx !== -1) {
    paragraf = parts[paraIdx].replace(/^§\s*/, '').trim();
  }

  const tail: string[] = [];
  if (paraIdx !== -1) {
    for (let i = paraIdx + 1; i < parts.length; i++) {
      const p = parts[i];
      if (
        /^odst\.\s*\d+$/i.test(p) ||
        /^písm\.\s*[a-z0-9]+\)?$/i.test(p) ||
        /^bod\s*\d+\.?$/i.test(p) ||
        /^věta\s*(první|druhá|třetí|\d+)\.?$/i.test(p)
      ) {
        tail.push(p);
      }
    }
  }

  return { law: law || undefined, paragraf: paragraf || undefined, tail };
}

function toUiFields(sourceFromText: string, meta?: Record<string, any>) {
  const { law, paragraf, tail } = parseBreadcrumb(sourceFromText);

  const lawPart = law ? `Zákon č. ${law} Sb.` : 'Zákon';
  const paraPart = paragraf ? `§ ${paragraf}` : '';

  const metaLabel = (meta?.label ?? '').toString().trim();
  const metaMarker = (meta?.marker ?? '').toString().trim();
  const fallbackTail = [metaLabel, metaMarker].filter(Boolean).join(' ').trim();

  const fullTail = tail.length > 0 ? tail : fallbackTail ? [fallbackTail] : [];

  const firstDetail = fullTail[0] ? ` ${fullTail[0]}` : '';
  const paragraf_cislo = paraPart ? `${paraPart}${firstDetail}`.trim() : metaLabel || 'Ustanovení';

  const rest = fullTail.slice(1);
  const paragraf_path = [lawPart, ...rest].filter(Boolean).join(' > ');

  return { law, paragraf_cislo, paragraf_path };
}

function similarityFromDistance(distance: number): number {
  if (!Number.isFinite(distance) || distance < 0) return 0;
  return 1 / (1 + distance);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const date = (url.searchParams.get('date') ?? '').trim();
    const kRaw = url.searchParams.get('k') ?? '8';
    const lawIdParam = url.searchParams.get('lawId');

    const k = Math.min(20, Math.max(3, Number(kRaw) || 8));

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const qEmb = await embeddings.embedQuery(q);
    const qVec = toPgvectorLiteral(qEmb);

    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date);
    const validityWhere = dateOk
      ? and(
          lte(unitChunk.validFrom, date),
          or(isNull(unitChunk.validTo), gte(unitChunk.validTo, date)),
        )
      : undefined;

    const lawFilter =
      lawIdParam && !isNaN(Number(lawIdParam)) ? eq(unitNode.lawId, Number(lawIdParam)) : undefined;

    const distExpr = sql<number>`${unitChunk.embedding} <-> ${qVec}::vector(${sql.raw(String(EMBEDDING_DIM))})`;

    const rows = await db
      .select({
        id: unitChunk.id,
        unitTextId: unitChunk.unitTextId,
        chunkIndex: unitChunk.chunkIndex,
        label: unitChunk.label,
        marker: unitChunk.marker,
        validFrom: unitChunk.validFrom,
        validTo: unitChunk.validTo,
        textWithContext: unitChunk.textWithContext,
        distance: distExpr.as('distance'),
      })
      .from(unitChunk)
      .innerJoin(unitText, eq(unitChunk.unitTextId, unitText.id))
      .innerJoin(unitNode, eq(unitText.nodeId, unitNode.id))
      .where(
        and(
          isNotNull(unitChunk.embedding),
          validityWhere ? validityWhere : sql`true`,
          lawFilter ? lawFilter : sql`true`,
        ),
      )
      .orderBy(distExpr)
      .limit(k);

    const results = rows.map(r => {
      const { sourceFromText, content } = splitTextWithContext(r.textWithContext ?? '');
      const { law, paragraf_cislo, paragraf_path } = toUiFields(sourceFromText, {
        label: r.label,
        marker: r.marker,
      });

      const predpis_id = law ? (lawToPredpisId(law) ?? 0) : 0;

      return {
        id: r.id,
        predpis_id,
        paragraf_path,
        paragraf_cislo,
        text_cisty: content || r.textWithContext,
        cosine_sim: similarityFromDistance(r.distance),
      };
    });

    return NextResponse.json({ results });
  } catch (e) {
    console.error('API Search Error:', e);
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}
