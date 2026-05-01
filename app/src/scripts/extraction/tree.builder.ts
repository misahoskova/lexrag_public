import { asNullOrString } from '../utils/string.utils';
import { MasterJsonMeta, NodeType, Table, MasterJsonNode } from '../types/types';
import { parseParMarker } from './parser.helpers';

function isContainerType(type: NodeType): boolean {
  return [
    'CAST_ZAKONA',
    'HLAVA',
    'DIL',
    'ODDIL',
    'PODODDIL',
    'PARAGRAF',
    'ODSTAVEC',
    'PISMENO',
    'PRILOHA',
  ].includes(type);
}

export function createZakon(meta: MasterJsonMeta) {
  return {
    meta,
    nodes: [] as MasterJsonNode[],
  };
}

export function createCast(label: string, marker: string) {
  return {
    type: 'CAST_ZAKONA' as const,
    label: asNullOrString(label),
    marker: asNullOrString(marker),
    orderIndex: 0,
  };
}

export function createHlava(label: string, marker: string) {
  return {
    type: 'HLAVA' as const,
    label: asNullOrString(label),
    marker: asNullOrString(marker),
    orderIndex: 0,
  };
}

export function createDil(label: string, marker: string) {
  return {
    type: 'DIL' as const,
    label: asNullOrString(label),
    marker: asNullOrString(marker),
    orderIndex: 0,
  };
}

export function createOddil(label: string, marker: string) {
  return {
    type: 'ODDIL' as const,
    label: asNullOrString(label),
    marker: asNullOrString(marker),
    orderIndex: 0,
  };
}

export function createPododdil(label: string, marker: string) {
  return {
    type: 'PODODDIL' as const,
    label: asNullOrString(label),
    marker: asNullOrString(marker),
    orderIndex: 0,
  };
}

export function createParagraf(label: string, text: string, marker: string) {
  const parMarker = parseParMarker(marker);
  return {
    type: 'PARAGRAF' as const,
    label: asNullOrString(label),
    text: (text ?? '').trim(),
    marker: asNullOrString(parMarker),
    orderIndex: 0,
  };
}

export function createOdstavec(text: string, marker: number) {
  return {
    label: null,
    type: 'ODSTAVEC' as const,
    text: (text ?? '').trim(),
    marker: marker,
    orderIndex: 0,
  };
}

export function createPismeno(text: string, marker: string) {
  return {
    label: null,
    type: 'PISMENO' as const,
    text: (text ?? '').trim(),
    marker: asNullOrString(marker),
    orderIndex: 0,
  };
}

export function createBod(text: string, marker: string) {
  return {
    label: null,
    type: 'BOD' as const,
    text: (text ?? '').trim(),
    marker: asNullOrString(marker),
    orderIndex: 0,
  };
}

export function createPriloha(
  title: string,
  text: string,
  marker: string,
  tables: Table[] = [],
  children: any[] = [],
) {
  const node: any = {
    type: 'PRILOHA' as const,
    label: asNullOrString(title),
    text: (text ?? '').trim(),
    marker: asNullOrString(marker),
    orderIndex: 0,
  };
  if (tables.length) node.tables = tables;
  if (children.length) node.children = children;

  return node;
}

export function createPoznamkaPodCarou(text: string, marker: string) {
  return {
    label: null,
    type: 'POZNAMKA_POD_CAROU' as const,
    text: (text ?? '').trim(),
    marker: asNullOrString(marker),
    orderIndex: 0,
  };
}

export function rankOf(type: NodeType | string): number {
  const map: Record<string, number> = {
    CAST_ZAKONA: 1,
    PRILOHA: 1,
    POZNAMKA_POD_CAROU: 1,
    HLAVA: 2,
    DIL: 3,
    ODDIL: 4,
    PODODDIL: 5,
    PARAGRAF: 6,
    ODSTAVEC: 7,
    PISMENO: 8,
    BOD: 9,
  };
  return map[type] ?? 999;
}

export function nestNodesFlatToTree(nodes: any[]) {
  const root: any[] = [];
  const stack: any[] = [];

  for (const node of nodes) {
    if (isContainerType(node.type) && !('children' in node)) {
      node.children = [];
    }

    const r = rankOf(node.type);

    while (
      stack.length &&
      (rankOf(stack[stack.length - 1].type) >= r || !isContainerType(stack[stack.length - 1].type))
    ) {
      stack.pop();
    }

    if (!stack.length) {
      root.push(node);
    } else {
      const parent = stack[stack.length - 1];
      if (isContainerType(parent.type)) {
        (parent.children ??= []).push(node);
      } else {
        root.push(node);
      }
    }
    stack.push(node);
  }

  const indexRecursive = (nodes: any[], prefix = '') => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.orderIndex = i + 1;
      if (node.children) {
        indexRecursive(node.children, `${prefix}${node.orderIndex}.`);
      }
    }
  };
  indexRecursive(root);

  return root;
}
