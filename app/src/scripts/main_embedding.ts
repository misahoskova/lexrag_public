import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../lib/db';
import { unitChunk } from '../db/schema';
import { eq, isNull, sql } from 'drizzle-orm';
import { loadEnv } from './utils/env';
import OpenAI from 'openai';
import process from 'process';

console.log('Running main_embedding script...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv(__dirname);

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMS = 1536;
const PRICE_PER_1M_TOKENS_USD = 0.13;
const API_BATCH_SIZE = 500;

async function main() {
  const totalCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(unitChunk)
    .where(isNull(unitChunk.embedding));

  let totalChunksToProcess = Number(totalCountResult[0].count);
  console.log(`Total chunks to process: ${totalChunksToProcess}`);

  if (totalChunksToProcess === 0) {
    console.log('No chunks to process. Exiting.');
    return;
  }

  console.log(`Found ${totalChunksToProcess} chunks to process.`);
  console.log(`Using model: ${EMBEDDING_MODEL} with ${EMBEDDING_DIMS} dimensions.`);

  let totalProcessed = 0;
  let totalTokensProcessed = 0;

  while (totalProcessed < totalChunksToProcess) {
    console.log(`Processing batch... (${totalProcessed}/${totalChunksToProcess})`);

    const chunks = await db
      .select({
        id: unitChunk.id,
        text: unitChunk.textWithContext,
      })
      .from(unitChunk)
      .where(isNull(unitChunk.embedding))
      .limit(API_BATCH_SIZE);

    if (chunks.length === 0) {
      break;
    }

    const textsToEmbed = chunks.map(c => c.text.replace(/\n/g, ' '));

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: textsToEmbed,
        dimensions: EMBEDDING_DIMS,
      });

      const tokensInThisBatch = response.usage?.total_tokens ?? 0;
      totalTokensProcessed += tokensInThisBatch;

      await db.transaction(async tx => {
        for (let i = 0; i < chunks.length; i++) {
          const chunkId = chunks[i].id;
          const embeddingVector = response.data[i].embedding;

          await tx
            .update(unitChunk)
            .set({ embedding: embeddingVector })
            .where(eq(unitChunk.id, chunkId));
        }
      });
      totalProcessed += chunks.length;
    } catch (error) {
      console.error('Error during embedding or database update:', error);
      console.log('Script is going to exit due to the error.');
      process.exit(1);
    }
  }
  const totalCostUSD = (totalTokensProcessed / 1_000_000) * PRICE_PER_1M_TOKENS_USD;

  console.log('✅ Embedding process completed.');
  console.log(`Processed tokens in summary: ${totalTokensProcessed.toLocaleString('cs-CZ')}`);
  console.log(`Costs in summary (USD): $${totalCostUSD.toFixed(2)}`);
  console.log(`Estimated total cost: ${totalCostUSD.toFixed(6)} USD`);
}

main().catch(e => {
  console.error('💥 Generování embeddingů selhalo:', e);
  process.exit(1);
});
