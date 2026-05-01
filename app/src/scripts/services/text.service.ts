import { db } from '../../lib/db';
import { unitContext, unitText, unitChunk } from '../../db/schema';
import { MasterJsonMeta } from '../types/types';
import { asNullOrString } from '../utils/string.utils';
import { eq, and, isNull, lt } from 'drizzle-orm';

export async function maybeCreateText(
  nodeId: string,
  meta: MasterJsonMeta,
  breadcrumbParts: string[],
  unitLabel: string | null,
  rawText?: string | null,
  documentVersionId?: number | null,
  tables?: any[],
) {
  const textRaw = rawText?.trim() ?? '';

  let tablesText = '';
  if (Array.isArray(tables) && tables.length > 0) {
    tablesText = tables
      .map(t => {
        const titleStr = t.title ? `Tabulka: ${t.title}\n` : 'Tabulka:\n';
        const contentStr = typeof t.rows === 'string' ? t.rows : JSON.stringify(t.rows);
        return `\n${titleStr}${contentStr}`;
      })
      .join('\n');
  }

  if (!textRaw && !tablesText) return null;

  const combinedText = `${textRaw}${tablesText}`.trim();

  const validFrom = asNullOrString(meta.ucinneOd) ?? meta.platneOd;
  const validTo = asNullOrString(meta.ucinneDo) ?? null;

  const breadcrumb = breadcrumbParts.filter(Boolean).join(' > ');
  const lawTitle = `${meta.cislo}/${meta.rok} – ${meta.nazev}`;

  if (validFrom) {
    const fromDate = new Date(validFrom);
    fromDate.setDate(fromDate.getDate() - 1);
    const yesterday = fromDate.toISOString().split('T')[0];

    const oldContexts = await db
      .select({ unitTextId: unitContext.unitTextId })
      .from(unitContext)
      .where(and(eq(unitContext.breadcrumb, breadcrumb), eq(unitContext.lawTitle, lawTitle)));

    const oldTextIds = oldContexts.map(c => c.unitTextId);

    if (oldTextIds.length > 0) {
      for (const oldId of oldTextIds) {
        await db
          .update(unitText)
          .set({ validTo: yesterday })
          .where(
            and(
              eq(unitText.id, oldId),
              isNull(unitText.validTo),
              lt(unitText.validFrom, validFrom),
            ),
          );

        await db
          .update(unitChunk)
          .set({ validTo: yesterday })
          .where(
            and(
              eq(unitChunk.unitTextId, oldId),
              isNull(unitChunk.validTo),
              lt(unitChunk.validFrom, validFrom),
            ),
          );
      }
    }
  }

  const [uText] = await db
    .insert(unitText)
    .values({
      nodeId,
      documentVersionId: documentVersionId ?? undefined,
      validFrom,
      validTo: validTo ?? undefined,
      textRaw: textRaw || (tablesText ? 'Obsahuje tabulková data' : ''),
      textWithContext: combinedText,
      sourceUrl: meta.staleUrl ?? meta.sourceUrl ?? null,
    })
    .returning({ id: unitText.id });

  await db.insert(unitContext).values({
    unitTextId: uText.id,
    breadcrumb,
    lawTitle,
    unitLabel: unitLabel ?? null,
    staleUrl: meta.staleUrl ?? null,
    pathMarkers: JSON.stringify(breadcrumbParts),
    parentNodeIds: JSON.stringify([]),
  });

  return uText.id;
}
