import { and, eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { documentVersion, zakon } from '../../db/schema';
import { MasterJsonMeta, Law } from '../types/types';
import { asNullOrString } from '../utils/string.utils';

export async function upsertLaw(meta: MasterJsonMeta): Promise<number> {
  const [found] = await db
    .select({ id: zakon.id })
    .from(zakon)
    .where(and(eq(zakon.cislo, meta.cislo), eq(zakon.rok, meta.rok)))
    .limit(1);

  if (found) {
    await db
      .update(zakon)
      .set({
        zkratka: meta.zkratka ?? null,
        nazev: meta.nazev,
        staleUrl: meta.staleUrl ?? null,
        sourceUrl: meta.sourceUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(zakon.id, found.id));
    return found.id;
  }

  const [ins] = await db
    .insert(zakon)
    .values({
      cislo: meta.cislo,
      rok: meta.rok,
      zkratka: meta.zkratka ?? null,
      nazev: meta.nazev,
      staleUrl: meta.staleUrl ?? null,
      sourceUrl: meta.sourceUrl ?? null,
    })
    .returning({ id: zakon.id });

  return ins.id;
}

export async function ensureDocumentVersion(lawId: number, meta: MasterJsonMeta): Promise<number> {
  const platneOdDate = asNullOrString(meta.platneOd);
  if (!platneOdDate) {
    throw new Error(
      `Missing 'platneOd' in metadata for law ${meta.rok}/${meta.cislo}. Cannot create document version.`,
    );
  }

  const [ver] = await db
    .insert(documentVersion)
    .values({
      lawId,
      platneOd: platneOdDate,
      ucinneOd: asNullOrString(meta.ucinneOd) ?? undefined,
      ucinneDo: asNullOrString(meta.ucinneDo) ?? undefined,
      sourceUrl: meta.staleUrl ?? meta.sourceUrl ?? '',
      note: 'import from master JSON',
    })
    .onConflictDoNothing()
    .returning({ id: documentVersion.id });

  if (ver) return ver.id;

  const [existing] = await db
    .select({ id: documentVersion.id })
    .from(documentVersion)
    .where(and(eq(documentVersion.lawId, lawId), eq(documentVersion.platneOd, platneOdDate)))
    .limit(1);

  if (!existing) {
    throw new Error('Failed to insert or find document version.');
  }

  return existing.id;
}

export async function resolveLawId(cislo: number, rok: number): Promise<number | null> {
  const row = await db.query.zakon.findFirst({
    where: and(eq(zakon.cislo, cislo), eq(zakon.rok, rok)),
    columns: { id: true },
  });
  return row?.id ?? null;
}

export async function getLawById(lawId: number): Promise<Law | null> {
  const row = await db.query.zakon.findFirst({
    where: eq(zakon.id, lawId),
    columns: { cislo: true, rok: true },
  });
  if (row && row.cislo && row.rok) {
    return { cislo: row.cislo, rok: row.rok };
  }
  return null;
}
