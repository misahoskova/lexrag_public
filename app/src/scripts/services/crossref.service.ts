import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../lib/db';
import { crossref, unitNode, unitText, unitContext, poznamka_reference } from '../../db/schema';
import { CrossrefAddress } from '../types/types';
import { getLawById, resolveLawId } from './law.service';
import { norm, windowAround } from '../utils/string.utils';
import { expandListOrRanges, expandRangeNumeric } from '../utils/list.utils';
import {
  reParagraph,
  reParRange,
  looksLikeLegalText,
  parseAddressFromMatch,
  normalizeRef,
  reFootnote,
} from '../crossref/crossref.parsers';

import { defaultAliases, decideLaw } from '../crossref/crossref.logic';
import { resolveNodeId, resolveFootnoteNodeId } from '../crossref/crossref.resolver';

type UpsertCrossrefArgs = {
  unitTextId: number;
  rawText: string;
  normalized?: string | null;
  targetNodeId?: string | null;
  confidence?: number;
  note?: string | null;
};

export async function upsertCrossref(args: UpsertCrossrefArgs): Promise<void> {
  await db
    .insert(crossref)
    .values({
      unitTextId: args.unitTextId,
      rawText: args.rawText,
      normalized: args.normalized ?? null,
      targetNodeId: args.targetNodeId ?? null,
      confidence: args.confidence ?? 100,
      note: args.note ?? null,
    })
    .onConflictDoNothing();
}

async function upsertFootnoteReference(args: {
  unitTextId: number;
  poznamkaNodeId: string | null;
  rawText: string;
  marker: string;
  charIndex?: number;
}): Promise<void> {
  await db
    .insert(poznamka_reference)
    .values({
      unitTextId: args.unitTextId,
      poznamkaNodeId: args.poznamkaNodeId,
      rawText: args.rawText,
      marker: args.marker,
      charIndex: args.charIndex,
    })
    .onConflictDoNothing();
}

export async function detectAllLinks(lawId: number): Promise<void> {
  const currentLaw = await getLawById(lawId);
  if (!currentLaw) {
    console.warn(`⚠️ zákon lawId=${lawId} nenalezen, detekci přeskočím`);
    return;
  }
  const aliases = defaultAliases();

  const rows = await db
    .select({
      unitTextId: unitText.id,
      text: unitText.textRaw,
      breadcrumb: unitContext.breadcrumb,
      nodeId: unitText.nodeId,
    })
    .from(unitText)
    .innerJoin(unitContext, eq(unitContext.unitTextId, unitText.id))
    .innerJoin(unitNode, eq(unitNode.id, unitText.nodeId))
    .where(eq(unitNode.lawId, lawId));

  let totalParagraphRefs = 0;
  let totalFootnoteRefs = 0;

  for (const row of rows) {
    const s = norm(row.text ?? '');
    if (!s) continue;

    if (looksLikeLegalText(s)) {
      reParagraph.lastIndex = 0;
      let m: RegExpExecArray | null;

      while ((m = reParagraph.exec(s)) !== null) {
        const spanStart = m.index ?? 0;
        const spanEnd = reParagraph.lastIndex;
        const rawText = s.slice(spanStart, spanEnd);
        const ctx = windowAround(s, { start: spanStart, end: spanEnd }, 150);

        const addr = parseAddressFromMatch(m);
        const normalized = normalizeRef(m);

        reParRange.lastIndex = 0;
        let parList: string[] | null = null;
        const rr = reParRange.exec(ctx);
        if (rr && rr[1] && rr[2]) {
          parList = expandRangeNumeric(rr[1].toLowerCase(), rr[2].toLowerCase());
        }

        const decided = decideLaw(ctx, aliases, currentLaw);

        const basePar = addr.par!;
        const parTargets = parList && parList.length > 1 ? parList : [basePar];
        const odstTargets = expandListOrRanges(addr.odst, false);
        const pismTargets = expandListOrRanges(addr.pism, true);
        const bodTargets = expandListOrRanges(addr.bod, false);

        const targets: CrossrefAddress[] = [];
        if (odstTargets.length === 0 && pismTargets.length === 0 && bodTargets.length === 0) {
          for (const par of parTargets) targets.push({ par });
        } else if (odstTargets.length && pismTargets.length === 0 && bodTargets.length === 0) {
          for (const par of parTargets) for (const odst of odstTargets) targets.push({ par, odst });
        } else if (odstTargets.length && pismTargets.length && bodTargets.length === 0) {
          for (const par of parTargets)
            for (const odst of odstTargets)
              for (const pism of pismTargets) targets.push({ par, odst, pism });
        } else {
          // Komplexní případ se všemi úrovněmi
          for (const par of parTargets)
            for (const odst of odstTargets.length ? odstTargets : [undefined as any])
              for (const pism of pismTargets.length ? pismTargets : [undefined as any])
                for (const bod of bodTargets.length ? bodTargets : [undefined as any]) {
                  const a: CrossrefAddress = { par };
                  if (odst) a.odst = odst;
                  if (pism) a.pism = pism;
                  if (bod) a.bod = bod;
                  targets.push(a);
                }
        }

        for (const a of targets) {
          let targetLawId: number | null = null;
          if (decided.category === 'INTERNAL' && decided.targetLaw) {
            targetLawId = lawId;
          } else if (
            (decided.category === 'EXTERNAL_SBIRKA' || decided.category === 'EXTERNAL_ALIAS') &&
            decided.targetLaw
          ) {
            targetLawId = await resolveLawId(decided.targetLaw.cislo, decided.targetLaw.rok);
          }

          let targetNodeId: string | null = null;
          if (targetLawId && a.par) {
            targetNodeId = await resolveNodeId(targetLawId, a);
          }

          await upsertCrossref({
            unitTextId: row.unitTextId,
            rawText,
            normalized,
            targetNodeId,
            confidence: targetNodeId ? 100 : 60,
            note:
              decided.reason +
              (parList && parList.length > 1 ? ' | rozsah § rozbalen' : '') +
              (a.odst || a.pism || a.bod ? ' | sub-úroveň rozbalena' : ''),
          });

          totalParagraphRefs++;
        }
      }
    }

    reFootnote.lastIndex = 0;
    let mFootnote: RegExpExecArray | null;
    while ((mFootnote = reFootnote.exec(s)) !== null) {
      const rawText = mFootnote[0];
      const marker = mFootnote[1];
      const charIndex = mFootnote.index;

      const targetNodeId = await resolveFootnoteNodeId(lawId, marker);

      await upsertFootnoteReference({
        unitTextId: row.unitTextId,
        poznamkaNodeId: targetNodeId,
        rawText: rawText,
        marker: marker,
        charIndex: charIndex,
      });
      totalFootnoteRefs++;
    }
  }

  console.log(`✅ Odkazy: uloženo ${totalParagraphRefs} citací §.`);
  console.log(`✅ Odkazy: uloženo ${totalFootnoteRefs} odkazů na poznámky.`);
}
