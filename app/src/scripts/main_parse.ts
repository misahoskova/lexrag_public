import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import { and, eq } from 'drizzle-orm';
import { loadEnv } from './utils/env';
import { db } from '../lib/db';
import { zakon } from '../db/schema';
import {
  listLawDirs,
  findInputs,
  parseCisloRok,
  ensureDir,
  moveCrossDeviceSafe,
  writeMarker,
} from './utils/file.utils';
import { LawProcessingPipeline } from './services/pipline.service';
import { ingestMasterJson } from './services/node.service';
import { detectAllLinks } from './services/crossref.service';
import { resolvePendingCrossrefs } from './services/crossref.resolve.service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv(__dirname);

const ROOT = path.resolve(__dirname, '../../');

const RAW_ROOT = path.resolve(ROOT, 'data/raw');
const PROCESSED_ROOT = path.resolve(ROOT, 'data/processed');
const DONE_DIR_NAME = '_done';
const FAILED_DIR_NAME = '_failed';

const MOVE_RAW_DIR_ON_SUCCESS = false;
const MOVE_RAW_DIR_ON_FAIL = true;
const DELETE_PROCESSED_AFTER_INGEST = false;
const MOVE_PROCESSED_TO_DONE = !DELETE_PROCESSED_AFTER_INGEST;

function markRawSuccess(rawDir: string, details: any) {
  if (MOVE_RAW_DIR_ON_SUCCESS) {
    const doneRoot = path.join(RAW_ROOT, DONE_DIR_NAME);
    ensureDir(doneRoot);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dst = path.join(doneRoot, `${path.basename(rawDir)}__${stamp}`);
    moveCrossDeviceSafe(rawDir, dst);
    return;
  }
  writeMarker(rawDir, '_ingested.ok.json', {
    status: 'ok',
    ...details,
    at: new Date().toISOString(),
  });
}

function markRawFailed(rawDir: string, details: any) {
  if (MOVE_RAW_DIR_ON_FAIL) {
    const failedRoot = path.join(RAW_ROOT, FAILED_DIR_NAME);
    ensureDir(failedRoot);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dst = path.join(failedRoot, `${path.basename(rawDir)}__${stamp}`);
    moveCrossDeviceSafe(rawDir, dst);
    return;
  }
  writeMarker(rawDir, '_ingested.failed.json', {
    status: 'failed',
    ...details,
    at: new Date().toISOString(),
  });
}

function finalizeProcessed(outPath: string) {
  if (!fs.existsSync(outPath)) return;
  if (DELETE_PROCESSED_AFTER_INGEST) {
    fs.unlinkSync(outPath);
  } else if (MOVE_PROCESSED_TO_DONE) {
    const doneDir = path.join(PROCESSED_ROOT, DONE_DIR_NAME);
    ensureDir(doneDir);
    moveCrossDeviceSafe(outPath, path.join(doneDir, path.basename(outPath)));
  }
}

async function processOneRawDir(rawDir: string) {
  console.log(`\n📂 Dir: ${rawDir}`);

  if (fs.existsSync(path.join(rawDir, '_ingested.ok.json'))) {
    console.log('➡️  Přeskakuji: již označeno jako OK.');
    return;
  }
  if (fs.existsSync(path.join(rawDir, '_ingested.failed.json'))) {
    console.log('➡️  Přeskakuji: dříve failnuto.');
    return;
  }

  const { json, html } = findInputs(rawDir);
  if (!json) {
    console.warn('⚠️  Nenalezen vstupní JSON, přeskočeno.');
    return;
  }
  ensureDir(PROCESSED_ROOT);

  const { cislo, rok } = parseCisloRok(rawDir, json);
  let outPath: string | null = null;

  try {
    console.log('📦 Spouštím extrakci…');
    const pipeline = new LawProcessingPipeline(json, PROCESSED_ROOT, html);
    const { outPath: processedPath, data: masterJson } = pipeline.run();
    outPath = processedPath;
    console.log(`✅ Extrakce hotová → ${outPath}`);
    console.log(`📊 Nodes: ${masterJson.nodes.length}`);

    console.log('🧩 Ingest do DB…');
    const lawIdFromIngest = await ingestMasterJson(masterJson);
    let lawId: number | null = lawIdFromIngest;
    if (!lawId) {
      const metaCislo = masterJson?.meta?.cislo ?? cislo;
      const metaRok = masterJson?.meta?.rok ?? rok;
      if (metaCislo && metaRok) {
        const row = await db.query.zakon.findFirst({
          where: and(eq(zakon.cislo, metaCislo), eq(zakon.rok, metaRok)),
          columns: { id: true },
        });
        lawId = row?.id ?? null;
      }
    }
    if (!lawId) throw new Error('Nepodařilo se zjistit lawId po ingestu');

    console.log(`🔗 Crossref pro lawId=${lawId}…`);
    await detectAllLinks(lawId);
    console.log('✅ Crossref hotový');

    console.log('🧭 Resolvuji sirotčí crossrefy (scope: tento zákon)…');
    await resolvePendingCrossrefs({ onlyLawId: lawId });
    console.log('✅ Resolver (scoped) hotový');

    console.log('🌐 Resolver napříč celou DB (volitelné)…');
    await resolvePendingCrossrefs();
    console.log('✅ Resolver (global) hotový');

    if (outPath) finalizeProcessed(outPath);
    markRawSuccess(rawDir, {
      lawId,
      meta: { cislo: masterJson.meta.cislo, rok: masterJson.meta.rok },
    });
  } catch (err: any) {
    console.error('❌ Chyba ve zpracování složky:', rawDir);
    console.error(err?.stack ?? err);
    markRawFailed(rawDir, { error: String(err?.message ?? err) });
  }
}

async function main() {
  console.log(`🔍 RAW root: ${RAW_ROOT}`);
  const dirs = listLawDirs(RAW_ROOT, [DONE_DIR_NAME, FAILED_DIR_NAME]);
  if (dirs.length === 0) {
    console.log('🟡 Nic k zpracování.');
    return;
  }
  console.log(`➡️  Najito ${dirs.length} složek.`);
  for (const d of dirs) {
    await processOneRawDir(d);
  }
  console.log('\n🎉 Batch hotový.');
}

main().catch(e => {
  console.error('💥 Spouštění selhalo:', e);
  process.exit(1);
});
