import { db } from '../../lib/db';
import {
  paragraf,
  odstavec,
  pismeno,
  bod,
  unitNode,
  unitEdge,
  poznamka_pod_carou,
  priloha,
} from '../../db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { AddressableNodeType, CrossrefAddress } from '../types/types';
import { getUnitNodeIdByNative } from '../services/node.service';
import { parMarker } from './crossref.parsers';

async function getChildNativeIdByMarker(
  parentUnitNodeId: string,
  childType: AddressableNodeType,
  markerValue: string,
): Promise<number | null> {
  const cleaned = String(markerValue)
    .replace(/[^0-9a-z]+/gi, '')
    .toLowerCase();

  const children = await db
    .select({ childNodeId: unitNode.id, nativeId: unitNode.nativeId })
    .from(unitNode)
    .innerJoin(
      unitEdge,
      and(eq(unitEdge.childNodeId, unitNode.id), eq(unitEdge.parentNodeId, parentUnitNodeId)),
    )
    .where(eq(unitNode.type, childType));

  if (children.length === 0) return null;

  const scan = async (table: any) => {
    for (const ch of children) {
      const rows = await db
        .select({ id: table.id })
        .from(table)
        .where(
          and(
            eq(table.id, ch.nativeId),
            sql`lower(regexp_replace(${table.marker}, '[^0-9a-z]+', '', 'g')) = ${cleaned}`,
          ),
        )
        .limit(1);
      if (rows[0]?.id != null) return rows[0].id as number;
    }
    return null;
  };

  if (childType === 'ODSTAVEC') return await scan(odstavec);
  if (childType === 'PISMENO') return await scan(pismeno);
  if (childType === 'BOD') return await scan(bod);

  return null;
}

async function getPrilohaNativeId(lawId: number, prilohaMarker: string): Promise<number | null> {
  const cleaned = prilohaMarker.replace(/[^0-9a-z]+/gi, '').toLowerCase();
  const rows = await db
    .select({ id: priloha.id })
    .from(priloha)
    .where(
      and(
        eq(priloha.lawId, lawId),
        sql`lower(regexp_replace(${priloha.marker}, '[^0-9a-z]+', '', 'g')) = ${cleaned}`,
      ),
    )
    .limit(1);

  return rows[0]?.id ?? null;
}

async function getParagrafNativeId(lawId: number, par: string): Promise<number | null> {
  const cleaned = parMarker(par);
  const rows = await db
    .select({ id: paragraf.id })
    .from(paragraf)
    .where(
      and(
        eq(paragraf.lawId, lawId),
        sql`lower(regexp_replace(${paragraf.marker}, '[^0-9a-z]+', '', 'g')) = ${cleaned}`,
      ),
    )
    .limit(1);

  return rows[0]?.id ?? null;
}

async function getOdstavecNativeId(
  lawId: number,
  par: string,
  odst: string,
): Promise<number | null> {
  const parNative = await getParagrafNativeId(lawId, par);
  if (!parNative) return null;
  const parNodeId = await getUnitNodeIdByNative('PARAGRAF', parNative);
  if (!parNodeId) return null;

  return await getChildNativeIdByMarker(parNodeId, 'ODSTAVEC', odst);
}

async function getPismenoNativeId(
  lawId: number,
  par: string,
  odst: string,
  pism: string,
): Promise<number | null> {
  const odstNative = await getOdstavecNativeId(lawId, par, odst);
  if (!odstNative) return null;
  const odstNodeId = await getUnitNodeIdByNative('ODSTAVEC', odstNative);
  if (!odstNodeId) return null;

  return await getChildNativeIdByMarker(odstNodeId, 'PISMENO', pism);
}

async function getBodNativeId(
  lawId: number,
  par: string,
  odst: string,
  pism: string,
  bodCislo: string,
): Promise<number | null> {
  const pismNative = await getPismenoNativeId(lawId, par, odst, pism);
  if (!pismNative) return null;
  const pismNodeId = await getUnitNodeIdByNative('PISMENO', pismNative);
  if (!pismNodeId) return null;

  return await getChildNativeIdByMarker(pismNodeId, 'BOD', bodCislo);
}

export async function resolveNodeId(lawId: number, a: CrossrefAddress): Promise<string | null> {
  if (a.priloha) {
    const native = await getPrilohaNativeId(lawId, a.priloha);
    if (native) return await getUnitNodeIdByNative('PRILOHA', native);
    return null; 
  }

  if (a.par && a.odst && a.pism && a.bod) {
    const native = await getBodNativeId(lawId, a.par, a.odst, a.pism, a.bod);
    if (native) return await getUnitNodeIdByNative('BOD', native);
  }
  if (a.par && a.odst && a.pism) {
    const native = await getPismenoNativeId(lawId, a.par, a.odst, a.pism);
    if (native) return await getUnitNodeIdByNative('PISMENO', native);
  }
  if (a.par && a.odst) {
    const native = await getOdstavecNativeId(lawId, a.par, a.odst);
    if (native) return await getUnitNodeIdByNative('ODSTAVEC', native);
  }
  if (a.par) {
    const native = await getParagrafNativeId(lawId, a.par);
    if (native) return await getUnitNodeIdByNative('PARAGRAF', native);
  }
  return null;
}

export async function resolveFootnoteNodeId(lawId: number, marker: string): Promise<string | null> {
  const cleanedMarker = marker.replace(/[^0-9a-z]+/gi, '').toLowerCase();

  const nativeRow = await db.query.poznamka_pod_carou.findFirst({
    where: and(eq(poznamka_pod_carou.lawId, lawId), eq(poznamka_pod_carou.marker, cleanedMarker)),
    columns: { id: true },
  });

  if (!nativeRow) {
    console.warn(`[Crossref] Footnote with marker [${cleanedMarker}] not found.`);
    return null;
  }

  return await getUnitNodeIdByNative('POZNAMKA_POD_CAROU', nativeRow.id);
}