import { db } from '../../lib/db';
import {
  unitNode,
  unitEdge,
  cast_zakona as tblCast,
  hlava as tblHlava,
  dil as tblDil,
  oddil as tblOddil,
  pododdil as tblPododdil,
  paragraf as tblParagraf,
  odstavec as tblOdst,
  pismeno as tblPism,
  bod as tblBod,
  priloha as tblPril,
  poznamka_pod_carou as tblPoznamkaPodCarou,
} from '../../db/schema';
import { PgTable } from 'drizzle-orm/pg-core';
import { NodeType, MasterJson, AddressableNodeType } from '../types/types';
import { ensureDocumentVersion, upsertLaw } from './law.service';
import { walkTree } from './walker.service';
import { asNullOrString } from '../utils/string.utils';
import { and, eq } from 'drizzle-orm';

type NativeTable =
  | typeof tblCast
  | typeof tblHlava
  | typeof tblDil
  | typeof tblOddil
  | typeof tblPododdil
  | typeof tblParagraf
  | typeof tblOdst
  | typeof tblPism
  | typeof tblBod
  | typeof tblPril
  | typeof tblPoznamkaPodCarou;

const tableByType: Record<Exclude<NodeType, 'ZAKON'>, NativeTable> = {
  CAST_ZAKONA: tblCast,
  HLAVA: tblHlava,
  DIL: tblDil,
  ODDIL: tblOddil,
  PODODDIL: tblPododdil,
  PARAGRAF: tblParagraf,
  ODSTAVEC: tblOdst,
  PISMENO: tblPism,
  BOD: tblBod,
  PRILOHA: tblPril,
  POZNAMKA_POD_CAROU: tblPoznamkaPodCarou,
};

export async function createNativeAndNode(
  lawId: number,
  type: keyof typeof tableByType,
  label: string | null,
  marker: string | null | number,
  orderIndex: number,
  depth: number,
) {
  const tbl = tableByType[type];
  if (!tbl) throw new Error(`No native table mapped for type ${type}`);

  let safeMarker: string | null;
  if (typeof marker === 'number') {
    safeMarker = String(marker);
  } else {
    safeMarker = asNullOrString(marker);
  }

  const safeLabel = asNullOrString(label);
  const ord = Number.isFinite(orderIndex) ? orderIndex : 0;

  let nativeRow;
  if (type === 'POZNAMKA_POD_CAROU') {
    if (!safeMarker) {
      throw new Error('POZNAMKA_POD_CAROU requires marker (e.g. "79")');
    }
    [nativeRow] = await db
      .insert(tbl as PgTable)
      .values({
        lawId,
        orderIndex: ord,
        marker: safeMarker,
        label: safeLabel ?? '',
      })
      .returning({ id: (tbl as any).id });
  } else {
    [nativeRow] = await db
      .insert(tbl as PgTable)
      .values({
        lawId,
        orderIndex: ord,
        label: safeLabel ?? null,
        marker: safeMarker ?? null,
      })
      .returning({ id: (tbl as any).id });
  }

  const [nodeRow] = await db
    .insert(unitNode)
    .values({
      type,
      nativeId: nativeRow.id,
      lawId,
      depth,
      orderIndex: ord,
    })
    .returning({ id: unitNode.id });

  return { nativeId: nativeRow.id as number, nodeId: nodeRow.id as string };
}

export async function createEdge(parentNodeId: string, childNodeId: string, orderIndex: number) {
  await db.insert(unitEdge).values({ parentNodeId, childNodeId, orderIndex }).onConflictDoNothing();
}

export async function ensureLawRootNode(lawId: number): Promise<string> {
  const [root] = await db
    .insert(unitNode)
    .values({
      type: 'ZAKON',
      nativeId: lawId,
      lawId,
      depth: 0,
      orderIndex: 0,
    })
    .onConflictDoNothing()
    .returning({ id: unitNode.id });

  if (root?.id) return root.id;

  const found = await db.query.unitNode.findFirst({
    where: (t, { and, eq }) => and(eq(t.type, 'ZAKON'), eq(t.nativeId, lawId)),
    columns: { id: true },
  });

  if (!found?.id) throw new Error('Failed to get/create ZAKON root node');
  return found.id;
}

export async function ingestMasterJson(data: MasterJson): Promise<number> {
  const meta = data.meta;

  let lawId: number | null = null;

  await db.transaction(async tx => {
    lawId = await upsertLaw(meta);
    const versionId = await ensureDocumentVersion(lawId, meta);
    const rootId = await ensureLawRootNode(lawId);

    await walkTree(lawId!, versionId, rootId, data);
  });

  if (!lawId) throw new Error('law_id was not set after ingesting MasterJson');
  return lawId;
}

export async function getUnitNodeIdByNative(
  type: AddressableNodeType,
  nativeId: number,
): Promise<string | null> {
  const row = await db.query.unitNode.findFirst({
    where: and(eq(unitNode.type, type), eq(unitNode.nativeId, nativeId)),
    columns: { id: true },
  });
  return row?.id ?? null;
}
