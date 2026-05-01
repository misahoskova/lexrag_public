import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../lib/db';
import { unitText, unitContext, unitChunk, unitNode } from '../db/schema';
import { eq, and, sql, notExists, asc } from 'drizzle-orm';
import { loadEnv } from './utils/env';
import { norm } from './utils/string.utils';
import process from 'process';

console.log('Running main_chunk.ts...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
loadEnv(PROJECT_ROOT);

function getLastSentence(text: string): string {
  if (!text) return '';
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length === 0) {
    return text;
  }
  return sentences[sentences.length - 1] || '';
}

async function main() {
  console.log('Finding texts to chunk...');
  const textsToChunk = await db
    .select({
      unitTextId: unitText.id,
      rawText: unitText.textRaw,
      validFrom: unitText.validFrom,
      validTo: unitText.validTo,
      breadcrumb: unitContext.breadcrumb,
      lawTitle: unitContext.lawTitle,
      unitLabel: unitContext.unitLabel,
      nodeType: unitNode.type,
      lawId: unitNode.lawId,
      orderIndex: unitNode.orderIndex,
    })
    .from(unitText)
    .innerJoin(unitNode, eq(unitNode.id, unitText.nodeId))
    .innerJoin(unitContext, eq(unitContext.unitTextId, unitText.id))
    .where(
      notExists(
        db
          .select({ id: unitChunk.id })
          .from(unitChunk)
          .where(eq(unitChunk.unitTextId, unitText.id)),
      ),
    )
    .orderBy(unitNode.lawId, unitNode.orderIndex);

  if (textsToChunk.length === 0) {
    console.log('Done. No new texts to chunk.');
    return;
  }

  console.log(`Found ${textsToChunk.length} texts to create chunks from.`);

  const chunksToInsert = textsToChunk.map((text, i) => {
    const prevText =
      i > 0 && textsToChunk[i - 1].lawId === text.lawId ? textsToChunk[i - 1].rawText : null;

    const overlapText = prevText ? getLastSentence(prevText) : '';
    const cleanRawText = norm(text.rawText);

    const textWithOverlap = overlapText ? `${norm(overlapText)} ${cleanRawText}` : cleanRawText;

    const contextHeader = [text.lawTitle, text.breadcrumb]
      .filter(Boolean)
      .map(s => norm(s!))
      .join(' > ');

    const textWithContext = `${contextHeader}\n\n${textWithOverlap}`;
    const tokenCount = textWithOverlap.split(/\s+/).length;

    let correctMarker: string | null = null;
    if (text.breadcrumb) {
      const parts = text.breadcrumb.split(' > ');
      correctMarker = parts[parts.length - 1];
    }
    const safeMarker = correctMarker ? correctMarker.substring(0, 32) : null;

    return {
      unitTextId: text.unitTextId,
      chunkIndex: 0,
      chunkType: text.nodeType,
      marker: safeMarker,
      label: text.unitLabel,
      tokenCount: tokenCount,
      validFrom: text.validFrom,
      validTo: text.validTo,
      text: textWithOverlap,
      textWithContext: textWithContext,
      tsv: sql`to_tsvector('simple', ${textWithContext})`,
      embedding: null,
    };
  });

  const BATCH_SIZE = 5000;

  console.log(
    `Inserting ${chunksToInsert.length} new chunks into DB (in batches of ${BATCH_SIZE})...`,
  );

  for (let i = 0; i < chunksToInsert.length; i += BATCH_SIZE) {
    const batch = chunksToInsert.slice(i, i + BATCH_SIZE);

    console.log(
      `... inserting batch ${i / BATCH_SIZE + 1} / ${Math.ceil(
        chunksToInsert.length / BATCH_SIZE,
      )} (${batch.length} chunks)`,
    );
    await db.insert(unitChunk).values(batch);
  }

  console.log('✅ Chunking completed.');
}

main().catch(e => {
  console.error('💥 Chunking failed:', e);
  process.exit(1);
});
