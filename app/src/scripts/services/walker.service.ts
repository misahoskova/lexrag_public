import { MasterJson, MasterJsonNode, NodeType } from '../types/types';
import { createEdge, createNativeAndNode } from './node.service';
import { maybeCreateText } from './text.service';
import { asNullOrString } from '../utils/string.utils';
import { db } from '../../lib/db';
import { tabulka_prilohy as tblTabPril } from '../../db/schema';

function formatBreadcrumbLabel(
  type: string,
  marker: string | number | null,
  label: string | null,
): string {
  const m = asNullOrString(marker);
  const cleanLabel = asNullOrString(label);

  if (!m) return cleanLabel ?? '';

  switch (type) {
    case 'ZAKON':
      return `Zákon č. ${m}`;
    case 'CAST_ZAKONA':
      if (cleanLabel && /část/i.test(cleanLabel)) return cleanLabel;
      return `ČÁST ${m}`;
    case 'HLAVA':
      return `HLAVA ${m}`;
    case 'DIL':
      return `DÍL ${m}`;
    case 'ODDIL':
      return `ODDÍL ${m}`;
    case 'PARAGRAF':
      return `§ ${m}`;
    case 'ODSTAVEC':
      return `odst. ${m}`;
    case 'PISMENO':
      return m.includes(')') ? `písm. ${m}` : `písm. ${m})`;
    case 'BOD':
      return `bod ${m}`;
    case 'PRILOHA':
      return `Příloha č. ${m}`;
    case 'POZNAMKA_POD_CAROU':
      return `Poznámka ${m}`;
    default:
      return m;
  }
}

export async function walkTree(
  lawId: number,
  versionId: number | null,
  rootNodeId: string,
  data: MasterJson,
) {
  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  console.log('[INGEST] walkTree init', {
    depth: 1,
    nodesLen: nodes.length,
  });

  async function walk(
    parentNodeId: string,
    nodes: MasterJsonNode[],
    depth: number,
    trail: { formattedLabel: string; originalMarker: string | null | number }[],
  ) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return;
    }

    for (const n of nodes) {
      const normType = n.type as Exclude<NodeType, 'ZAKON'>;
      const order = n.orderIndex;
      const marker = n.marker;
      const tables = (n as any).tables;
      const prettyForBreadcrumb = formatBreadcrumbLabel(normType, marker, n.label);

      console.log('[INGEST] node', {
        rawType: n.type,
        depth,
        marker,
        prettyForBreadcrumb,
      });

      const { nodeId } = await createNativeAndNode(lawId, normType, n.label, marker, order, depth);

      await createEdge(parentNodeId, nodeId, order);

      const breadcrumbParts = [...trail.map(t => t.formattedLabel), prettyForBreadcrumb].filter(
        Boolean,
      );

      if (normType === 'POZNAMKA_POD_CAROU' && !prettyForBreadcrumb.includes('Poznámka')) {
        breadcrumbParts.push(`Poznámka ${marker}`);
      }

      const rawText = (n.text ?? '').trim();

      if (rawText || (Array.isArray(tables) && tables.length > 0)) {
        await maybeCreateText(
          nodeId,
          data.meta,
          breadcrumbParts,
          prettyForBreadcrumb,
          rawText,
          versionId,
          tables,
        );
      }

      if (Array.isArray(tables) && tables.length > 0) {
        console.log(`[INGEST] Ukládám tabulky (${tables.length}) pro uzel ${normType} ${marker}`);

        for (let i = 0; i < tables.length; i++) {
          const t = tables[i];
          await db.insert(tblTabPril).values({
            prilohaNodeId: nodeId,
            title: t.title || '',
            columns: typeof t.columns === 'string' ? t.columns : JSON.stringify(t.columns),
            rows: typeof t.rows === 'string' ? t.rows : JSON.stringify(t.rows),
            orderIndex: i,
          });
        }
      }

      if (n.children?.length) {
        await walk(nodeId, n.children, depth + 1, [
          ...trail,
          { formattedLabel: prettyForBreadcrumb, originalMarker: marker },
        ]);
      }
    }
  }

  await walk(rootNodeId, nodes, 1, []);
}
