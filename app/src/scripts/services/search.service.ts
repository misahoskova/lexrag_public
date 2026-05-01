import { db } from '../../lib/db';
import { unitChunk, crossref, unitText, unitNode } from '../../db/schema';
import { Document } from '@langchain/core/documents';
import { sql, isNotNull, and, lte, gte, or, isNull, inArray, eq } from 'drizzle-orm';
import { embeddings, toPgvectorLiteral, EMBEDDING_DIM } from '../utils/string.utils';

export async function retrieveTopK(
  question: string,
  k: number,
  targetDate?: string,
  lawId?: number,
): Promise<Document[]> {
  const qEmb = await embeddings.embedQuery(question);
  const qVec = toPgvectorLiteral(qEmb);
  let dateToCheck = targetDate || new Date().toISOString().slice(0, 10);

  console.log(`[RAG] Hledám k datu: ${dateToCheck}${lawId ? ` | Zákon ID: ${lawId}` : ''}`);

  const rows = await db
    .select({
      id: unitChunk.id,
      unitTextId: unitChunk.unitTextId,
      label: unitChunk.label,
      marker: unitChunk.marker,
      textWithContext: unitChunk.textWithContext,
      distance:
        sql<number>`${unitChunk.embedding} <=> ${qVec}::vector(${sql.raw(String(EMBEDDING_DIM))})`.as(
          'distance',
        ),
    })
    .from(unitChunk)
    .innerJoin(unitText, eq(unitChunk.unitTextId, unitText.id))
    .innerJoin(unitNode, eq(unitText.nodeId, unitNode.id))
    .where(
      and(
        isNotNull(unitChunk.embedding),
        lte(unitChunk.validFrom, dateToCheck),
        or(isNull(unitChunk.validTo), gte(unitChunk.validTo, dateToCheck)),
        lawId ? eq(unitNode.lawId, lawId) : sql`TRUE`,
        sql`${unitChunk.embedding} <=> ${qVec}::vector(${sql.raw(String(EMBEDDING_DIM))}) < 0.4`,
      ),
    )
    .orderBy(sql`${unitChunk.embedding} <=> ${qVec}::vector(${sql.raw(String(EMBEDDING_DIM))})`)
    .limit(k);

  if (rows.length === 0) return [];

  console.log(`\n--- VÝSLEDKY HLEDÁNÍ (Datum: ${dateToCheck}) ---`);

  rows.forEach((r, i) => {
    const displayLabel = (r.label || '').includes(r.marker || '---')
      ? r.label || ''
      : `${r.label || ''} ${r.marker || ''}`.trim();
    console.log(`[${i + 1}] Skóre: ${r.distance.toFixed(4)} | Paragraf: ${displayLabel}`);
  });

  console.log(`-------------------------------------------\n`);

  const unitTextIds = rows.map(r => r.unitTextId);
  const refs = await db
    .select({
      sourceUnitTextId: crossref.unitTextId,
      targetNodeId: crossref.targetNodeId,
      rawText: crossref.rawText,
    })
    .from(crossref)
    .where(and(inArray(crossref.unitTextId, unitTextIds), isNotNull(crossref.targetNodeId)));

  const targetNodeIds = [...new Set(refs.map(r => r.targetNodeId!))];
  let targetTextsMap: Record<string, string> = {};

  if (targetNodeIds.length > 0) {
    const targetRows = await db.execute(sql`
      WITH RECURSIVE graph_lookup AS (
        SELECT id as original_node_id, id as current_node_id, 0 as depth FROM unit_node WHERE id IN (${sql.join(
          targetNodeIds.map(id => sql`${id}`),
          sql`, `,
        )})
        UNION ALL
        SELECT gl.original_node_id, ue.parent_node_id, gl.depth + 1 FROM graph_lookup gl
        JOIN unit_edge ue ON gl.current_node_id = ue.child_node_id
        WHERE gl.depth < 3 AND NOT EXISTS (
          SELECT 1 FROM unit_text ut WHERE ut.node_id = gl.current_node_id AND ut.text_raw != '' AND ut.valid_from <= ${dateToCheck} AND (ut.valid_to IS NULL OR ut.valid_to >= ${dateToCheck})
        )
      )
      SELECT DISTINCT ON (gl.original_node_id) gl.original_node_id as "nodeId", ut.text_with_context as "textWithContext"
      FROM graph_lookup gl
      JOIN unit_text ut ON gl.current_node_id = ut.node_id
      WHERE ut.text_raw != '' AND ut.valid_from <= ${dateToCheck} AND (ut.valid_to IS NULL OR ut.valid_to >= ${dateToCheck})
      ORDER BY gl.original_node_id, gl.depth ASC;
    `);

    (targetRows.rows as any[]).forEach(tr => {
      targetTextsMap[tr.nodeId] = tr.textWithContext;
    });
    console.log(`[GraphRAG] 🕸️ Nalezeno ${targetRows.rows.length} textů přes křížové odkazy.`);
  }

  return rows.map(r => {
    let finalContent = r.textWithContext ?? '';
    const chunkRefs = refs.filter(ref => ref.sourceUnitTextId === r.unitTextId);
    if (chunkRefs.length > 0) {
      let refContent = '\n\n--- SOUVISEJÍCÍ USTANOVENÍ ---\n';
      chunkRefs.forEach(ref => {
        const tgt = targetTextsMap[ref.targetNodeId!];
        if (tgt) refContent += `\n[Text odkazovaného pravidla: ${ref.rawText}]\n${tgt}\n`;
      });
      finalContent += refContent;
    }
    return new Document({
      pageContent: finalContent,
      metadata: { ...r },
    });
  });
}
