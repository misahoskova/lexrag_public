import { db } from '../../lib/db';
import { unitChunk, unitText, unitNode } from '../../db/schema';
import { Document } from '@langchain/core/documents';
import { sql, and, lte, gte, or, isNull, eq } from 'drizzle-orm';
import { embeddings, toPgvectorLiteral, EMBEDDING_DIM } from '../utils/string.utils';

export async function retrieveTopK(
  question: string,
  k: number,
  targetDate?: string,
  lawId?: number,
): Promise<Document[]> {
  const qEmb = await embeddings.embedQuery(question);
  const qVec = toPgvectorLiteral(qEmb);

  let dateToCheck = new Date().toISOString().slice(0, 10);

  if (targetDate) {
    const parts = targetDate.split('.');
    if (parts.length === 3) {
      const day = parts[0].trim().padStart(2, '0');
      const month = parts[1].trim().padStart(2, '0');
      const year = parts[2].trim();
      dateToCheck = `${year}-${month}-${day}`;
    } else {
      dateToCheck = targetDate;
    }
  }

  console.log(`[RAG] Hledám k datu: ${dateToCheck}`);

  const MAX_DISTANCE = 0.4;

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
      vectorDistance:
        sql<number>`${unitChunk.embedding} <=> ${qVec}::vector(${sql.raw(String(EMBEDDING_DIM))})`.as(
          'vector_distance',
        ),
      textRank:
        sql<number>`ts_rank(to_tsvector('czech', ${unitChunk.textWithContext}), websearch_to_tsquery('czech', ${question}))`.as(
          'text_rank',
        ),
    })
    .from(unitChunk)
    .innerJoin(unitText, eq(unitChunk.unitTextId, unitText.id))
    .innerJoin(unitNode, eq(unitText.nodeId, unitNode.id))
    .where(
      and(
        lte(unitChunk.validFrom, dateToCheck),
        or(isNull(unitChunk.validTo), gte(unitChunk.validTo, dateToCheck)),
        lawId ? eq(unitNode.lawId, lawId) : undefined,
        or(
          sql`${unitChunk.embedding} <=> ${qVec}::vector(${sql.raw(String(EMBEDDING_DIM))}) < ${MAX_DISTANCE}`,
          sql`to_tsvector('czech', ${unitChunk.textWithContext}) @@ websearch_to_tsquery('czech', ${question})`,
        ),
      ),
    )
    .orderBy(
      sql`(${unitChunk.embedding} <=> ${qVec}::vector(${sql.raw(String(EMBEDDING_DIM))})) * 0.7 - ts_rank(to_tsvector('czech', ${unitChunk.textWithContext}), websearch_to_tsquery('czech', ${question})) * 0.3`,
    )
    .limit(k);

  console.log(`\n--- VÝSLEDKY HLEDÁNÍ (Datum: ${dateToCheck}) ---`);
  rows.forEach((r, i) => {
    console.log(
      `[${i + 1}] Skóre (Distance): ${r.vectorDistance.toFixed(4)} | Paragraf: ${r.label} ${r.marker}`,
    );
  });
  console.log(`-------------------------------------------\n`);

  return rows.map(r => {
    return new Document({
      pageContent: r.textWithContext ?? '',
      metadata: {
        id: r.id,
        unit_text_id: r.unitTextId,
        chunk_index: r.chunkIndex,
        label: r.label,
        marker: r.marker,
        valid_from: r.validFrom,
        valid_to: r.validTo,
        vector_distance: r.vectorDistance,
        text_rank: r.textRank,
      },
    });
  });
}
