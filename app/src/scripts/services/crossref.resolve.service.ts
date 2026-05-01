import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../lib/db';
import { crossref, unitText, unitContext, unitNode } from '../../db/schema';
import { defaultAliases, decideLaw } from '../crossref/crossref.logic';
import { resolveLawId, getLawById } from '../services/law.service';
import { resolveNodeId } from '../crossref/crossref.resolver';
import { norm as normalizeWhitespace } from '../utils/string.utils';
import {
  reParagraph,
  parseAddressFromMatch,
  rePriloha,
  parsePrilohaFromMatch,
} from '../crossref/crossref.parsers';

type PendingRow = {
  id: number;
  unitTextId: number;
  rawText: string;
  normalized: string | null;
  breadcrumb: string | null;
  lawId: number;
};

function parseAddressFromCrossref(rawText: string, normalized?: string | null) {
  if (normalized) {
    const out: any = {};
    for (const p of normalized.split('/')) {
      const [k, v] = p.split(':');
      if (k === 'PARAGRAF') out.par = v;
      if (k === 'ODSTAVEC') out.odst = v;
      if (k === 'PISMENO') out.pism = v;
      if (k === 'BOD') out.bod = v;
      if (k === 'PRILOHA') out.priloha = v;
    }

    if (out.par || out.priloha) return out;
  }

  reParagraph.lastIndex = 0;
  const mPar = reParagraph.exec(rawText);
  if (mPar) return parseAddressFromMatch(mPar);

  rePriloha.lastIndex = 0;
  const mPril = rePriloha.exec(rawText);
  if (mPril) return parsePrilohaFromMatch(mPril);

  return null;
}

async function loadPendingRows(scope?: { onlyLawId?: number }): Promise<PendingRow[]> {
  const rows = await db
    .select({
      id: crossref.id,
      unitTextId: crossref.unitTextId,
      rawText: crossref.rawText,
      normalized: crossref.normalized,
      breadcrumb: unitContext.breadcrumb,
      lawId: unitNode.lawId,
    })
    .from(crossref)
    .innerJoin(unitText, eq(unitText.id, crossref.unitTextId))
    .innerJoin(unitNode, eq(unitNode.id, unitText.nodeId))
    .leftJoin(unitContext, eq(unitContext.unitTextId, unitText.id))
    .where(
      and(
        sql`${crossref.targetNodeId} IS NULL`,
        scope?.onlyLawId ? eq(unitNode.lawId, scope.onlyLawId) : sql`TRUE`,
      ),
    );

  return rows as PendingRow[];
}

async function resolveOne(r: PendingRow) {
  const s = normalizeWhitespace(r.rawText ?? '');
  if (!s) return { ok: false as const, note: 'empty rawText' };

  const addr = parseAddressFromCrossref(r.rawText, r.normalized);

  if (!addr?.par && !addr?.priloha) {
    return { ok: false as const, note: 'no paragraph or priloha address' };
  }

  const curr = await getLawById(r.lawId);
  if (!curr) return { ok: false as const, note: 'current law missing' };

  const context = normalizeWhitespace(`${r.breadcrumb ?? ''} ${r.rawText}`);
  const decided = decideLaw(context, defaultAliases(), curr);

  let targetLawId: number | null = null;
  if (decided.targetLaw) {
    targetLawId = await resolveLawId(decided.targetLaw.cislo, decided.targetLaw.rok);
  } else if (decided.category === 'INTERNAL') {
    targetLawId = r.lawId;
  }

  if (!targetLawId) return { ok: false as const, note: decided.reason || 'no target law' };

  const nodeId = await resolveNodeId(targetLawId, addr);
  if (!nodeId) return { ok: false as const, note: decided.reason + ' | node not found' };

  return { ok: true as const, nodeId, confidence: 100, note: decided.reason || null };
}

export async function resolvePendingCrossrefs(scope?: { onlyLawId?: number }) {
  const rows = await loadPendingRows(scope);
  let resolved = 0,
    failed = 0;

  for (const r of rows) {
    const res = await resolveOne(r);
    if (res.ok) {
      await db
        .update(crossref)
        .set({
          targetNodeId: res.nodeId!,
          confidence: res.confidence ?? 100,
          note: sql`COALESCE(${crossref.note}, '') || ${res.note ? ' | ' + res.note : ''}`,
          updatedAt: new Date(),
        })
        .where(eq(crossref.id, r.id));
      resolved++;
    } else {
      failed++;
    }
  }

  return { total: rows.length, resolved, failed };
}
