import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  date,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
  uuid,
  customType,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const vector = (dim: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dim})`;
    },
    toDriver(value: number[]): string {
      return JSON.stringify(value);
    },
    fromDriver(value: string): number[] {
      return JSON.parse(value);
    },
  });

export const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

/* ==================================== LAW ==================================== */

export const zakon = pgTable(
  'zakon',
  {
    id: serial('id').primaryKey(),
    cislo: integer('cislo').notNull(),
    rok: integer('rok').notNull(),
    zkratka: text('zkratka'),
    nazev: text('nazev').notNull(),
    staleUrl: text('stale_url'),
    sourceUrl: text('source_url'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [
    uniqueIndex('u_zakon_ci_rok').on(t.cislo, t.rok),
    index('zakon_stale_url_idx').on(t.staleUrl),
  ],
);

/* ===================== Samostatné tabulky pro každou úroveň ===================== */

export const cast_zakona = pgTable(
  'cast_zakona',
  {
    id: serial('id').primaryKey(),
    lawId: integer('law_id')
      .notNull()
      .references(() => zakon.id, { onDelete: 'cascade' }),
    label: text('label'),
    marker: varchar('marker', { length: 32 }),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [index('cast_zakon_idx').on(t.lawId)],
);

export const hlava = pgTable(
  'hlava',
  {
    id: serial('id').primaryKey(),
    lawId: integer('law_id')
      .notNull()
      .references(() => zakon.id, { onDelete: 'cascade' }),
    label: text('label'),
    marker: varchar('marker', { length: 32 }),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [index('hlava_zakon_idx').on(t.lawId)],
);

export const dil = pgTable(
  'dil',
  {
    id: serial('id').primaryKey(),
    lawId: integer('law_id')
      .notNull()
      .references(() => zakon.id, { onDelete: 'cascade' }),
    label: text('label'),
    marker: varchar('marker', { length: 32 }),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [index('dil_zakon_idx').on(t.lawId)],
);

export const oddil = pgTable(
  'oddil',
  {
    id: serial('id').primaryKey(),
    lawId: integer('law_id')
      .notNull()
      .references(() => zakon.id, { onDelete: 'cascade' }),
    label: text('label'),
    marker: varchar('marker', { length: 32 }),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [index('oddil_zakon_idx').on(t.lawId)],
);

export const pododdil = pgTable(
  'pododdil',
  {
    id: serial('id').primaryKey(),
    lawId: integer('law_id')
      .notNull()
      .references(() => zakon.id, { onDelete: 'cascade' }),
    label: text('label'),
    marker: varchar('marker', { length: 32 }),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [index('pododdil_zakon_idx').on(t.lawId)],
);

export const paragraf = pgTable(
  'paragraf',
  {
    id: serial('id').primaryKey(),
    lawId: integer('law_id')
      .notNull()
      .references(() => zakon.id, { onDelete: 'cascade' }),
    label: text('label'),
    marker: varchar('marker', { length: 32 }),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [index('par_zakon_idx').on(t.lawId), index('par_marker_idx').on(t.lawId, t.marker)],
);

export const odstavec = pgTable(
  'odstavec',
  {
    id: serial('id').primaryKey(),
    lawId: integer('law_id')
      .notNull()
      .references(() => zakon.id, { onDelete: 'cascade' }),
    marker: varchar('marker', { length: 32 }),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [index('odst_zakon_idx').on(t.lawId)],
);

export const pismeno = pgTable(
  'pismeno',
  {
    id: serial('id').primaryKey(),
    lawId: integer('law_id')
      .notNull()
      .references(() => zakon.id, { onDelete: 'cascade' }),
    marker: varchar('marker', { length: 32 }),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [index('pism_zakon_idx').on(t.lawId)],
);

export const bod = pgTable(
  'bod',
  {
    id: serial('id').primaryKey(),
    lawId: integer('law_id')
      .notNull()
      .references(() => zakon.id, { onDelete: 'cascade' }),
    marker: varchar('marker', { length: 32 }),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [index('bod_zakon_idx').on(t.lawId)],
);

export const priloha = pgTable(
  'priloha',
  {
    id: serial('id').primaryKey(),
    lawId: integer('law_id')
      .notNull()
      .references(() => zakon.id, { onDelete: 'cascade' }),
    label: text('label'),
    marker: varchar('marker', { length: 32 }),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [index('priloha_zakon_idx').on(t.lawId)],
);

export const tabulka_prilohy = pgTable(
  'tabulka_prilohy',
  {
    id: serial('id').primaryKey(),
    prilohaNodeId: uuid('priloha_node_id')
      .notNull()
      .references(() => unitNode.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    columns: text('columns_json').notNull(),
    rows: text('rows_json').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [index('appendix_table_node_idx').on(t.prilohaNodeId, t.orderIndex)],
);

export const poznamka_pod_carou = pgTable(
  'poznamka_pod_carou',
  {
    id: serial('id').primaryKey(),
    lawId: integer('law_id')
      .notNull()
      .references(() => zakon.id, { onDelete: 'cascade' }),
    marker: varchar('marker', { length: 32 }).notNull(),
    text: text('text'),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  t => [
    index('poznamka_pod_carou_zakon_idx').on(t.lawId),
    index('poznamka_pod_carou_marker_idx').on(t.lawId, t.marker),
  ],
);
/* =============== Registr uzlů + hrany (unifikace stromu a přeskočení úrovní) =============== */

export const nodeTypeEnum = pgEnum('node_type', [
  'ZAKON',
  'CAST_ZAKONA',
  'HLAVA',
  'DIL',
  'ODDIL',
  'PODODDIL',
  'PARAGRAF',
  'ODSTAVEC',
  'PISMENO',
  'BOD',
  'PRILOHA',
  'POZNAMKA_POD_CAROU',
]);

export const unitNode = pgTable(
  'unit_node',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: nodeTypeEnum('type').notNull(),
    nativeId: integer('native_id').notNull(),
    lawId: integer('law_id')
      .notNull()
      .references(() => zakon.id, { onDelete: 'cascade' }),
    depth: integer('depth').notNull().default(0),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [
    uniqueIndex('u_node_type_native').on(t.type, t.nativeId),
    index('node_zakon_idx').on(t.lawId, t.depth, t.orderIndex),
  ],
);

export const unitEdge = pgTable(
  'unit_edge',
  {
    parentNodeId: uuid('parent_node_id')
      .notNull()
      .references(() => unitNode.id, { onDelete: 'cascade' }),
    childNodeId: uuid('child_node_id')
      .notNull()
      .references(() => unitNode.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull(),
  },
  t => [
    uniqueIndex('u_edge_child').on(t.childNodeId),
    index('edge_parent_idx').on(t.parentNodeId, t.orderIndex),
  ],
);

/* ==================================== Verze dokumentu ==================================== */

export const documentVersion = pgTable(
  'document_version',
  {
    id: serial('id').primaryKey(),
    lawId: integer('law_id')
      .notNull()
      .references(() => zakon.id, { onDelete: 'cascade' }),
    platneOd: date('vyhlaseno_dne').notNull(),
    ucinneOd: date('ucinne_od'),
    ucinneDo: date('ucinne_do'),
    sourceUrl: text('source_url').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [
    index('document_version_zakon_idx').on(t.lawId),
    index('document_version_effect_idx').on(t.ucinneOd, t.ucinneDo),
  ],
);

/* ========================= Texty + Kontext + Chunky ========================= */

export const unitText = pgTable(
  'unit_text',
  {
    id: serial('id').primaryKey(),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => unitNode.id, { onDelete: 'cascade' }),
    documentVersionId: integer('document_version_id').references(() => documentVersion.id, {
      onDelete: 'set null',
    }),

    validFrom: date('valid_from').notNull(),
    validTo: date('valid_to'),

    textRaw: text('text_raw').notNull(),
    textWithContext: text('text_with_context').notNull(),
    sourceUrl: text('source_url'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [
    index('unit_text_node_idx').on(t.nodeId),
    index('unit_text_version_idx').on(t.documentVersionId),
    index('unit_text_valid_idx').on(t.validFrom, t.validTo),
    uniqueIndex('u_text_node_from').on(t.nodeId, t.validFrom),
  ],
);

export const unitContext = pgTable(
  'unit_context',
  {
    id: serial('id').primaryKey(),
    unitTextId: integer('unit_text_id')
      .notNull()
      .references(() => unitText.id, { onDelete: 'cascade' }),

    breadcrumb: text('breadcrumb').notNull(),
    lawTitle: text('law_title').notNull(),
    unitLabel: text('unit_label'),
    staleUrl: text('stale_url'),
    pathMarkers: text('path_markers_json').notNull(),
    parentNodeIds: text('parent_node_ids_json').notNull(),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [index('unit_context_text_idx').on(t.unitTextId)],
);

export const unitChunk = pgTable(
  'unit_chunk',
  {
    id: serial('id').primaryKey(),
    unitTextId: integer('unit_text_id')
      .notNull()
      .references(() => unitText.id, { onDelete: 'cascade' }),

    chunkIndex: integer('chunk_index').notNull(),
    chunkType: varchar('chunk_type', { length: 32 }).notNull(),
    marker: varchar('marker', { length: 32 }),
    label: text('label'),
    tokenCount: integer('token_count').notNull(),

    validFrom: date('valid_from').notNull(),
    validTo: date('valid_to'),

    text: text('text').notNull(),
    textWithContext: text('text_with_context').notNull(),

    embedding: vector(1536)('embedding'),
    tsv: tsvector('tsv'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [
    uniqueIndex('u_chunk').on(t.unitTextId, t.chunkIndex, t.validFrom),
    index('chunk_valid_idx').on(t.validFrom, t.validTo),
    index('chunk_text_idx').on(t.unitTextId),
  ],
);

/* ==================================== Křížové odkazy ==================================== */

export const crossref = pgTable(
  'crossref',
  {
    id: serial('id').primaryKey(),
    unitTextId: integer('unit_text_id')
      .notNull()
      .references(() => unitText.id, { onDelete: 'cascade' }),
    rawText: text('raw_text').notNull(),
    normalized: text('normalized'),
    targetNodeId: uuid('target_node_id').references(() => unitNode.id, {
      onDelete: 'set null',
    }),
    confidence: integer('confidence'),
    note: text('note'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => [
    index('crossref_text_idx').on(t.unitTextId),
    index('crossref_target_idx').on(t.targetNodeId),
  ],
);

export const poznamka_reference = pgTable(
  'poznamka_reference',
  {
    id: serial('id').primaryKey(),
    unitTextId: integer('unit_text_id')
      .notNull()
      .references(() => unitText.id, { onDelete: 'cascade' }),
    poznamkaNodeId: uuid('poznamka_node_id').references(() => unitNode.id, {
      onDelete: 'set null',
    }),
    rawText: varchar('raw_text', { length: 32 }),
    marker: varchar('marker', { length: 32 }),
    charIndex: integer('char_index'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  t => [
    index('poznamka_ref_text_idx').on(t.unitTextId),
    index('poznamka_ref_node_idx').on(t.poznamkaNodeId),
  ],
);

/* ==================================== RELATIONS ==================================== */

export const lawRelations = relations(zakon, ({ many }) => ({
  casti: many(cast_zakona),
  hlavy: many(hlava),
  dily: many(dil),
  oddily: many(oddil),
  pododdily: many(pododdil),
  paragrafy: many(paragraf),
  odstavce: many(odstavec),
  pismena: many(pismeno),
  body: many(bod),
  prilohy: many(priloha),
  poznamkyPodCarou: many(poznamka_pod_carou),
}));

export const castRelations = relations(cast_zakona, ({ one }) => ({
  zakon: one(zakon, {
    fields: [cast_zakona.lawId],
    references: [zakon.id],
  }),
}));

export const hlavaRelations = relations(hlava, ({ one }) => ({
  zakon: one(zakon, {
    fields: [hlava.lawId],
    references: [zakon.id],
  }),
}));

export const dilRelations = relations(dil, ({ one }) => ({
  zakon: one(zakon, {
    fields: [dil.lawId],
    references: [zakon.id],
  }),
}));

export const oddilRelations = relations(oddil, ({ one }) => ({
  zakon: one(zakon, {
    fields: [oddil.lawId],
    references: [zakon.id],
  }),
}));

export const pododdilRelations = relations(pododdil, ({ one }) => ({
  zakon: one(zakon, {
    fields: [pododdil.lawId],
    references: [zakon.id],
  }),
}));

export const paragrafRelations = relations(paragraf, ({ one }) => ({
  zakon: one(zakon, {
    fields: [paragraf.lawId],
    references: [zakon.id],
  }),
}));

export const odstavecRelations = relations(odstavec, ({ one }) => ({
  zakon: one(zakon, {
    fields: [odstavec.lawId],
    references: [zakon.id],
  }),
}));

export const pismenoRelations = relations(pismeno, ({ one }) => ({
  zakon: one(zakon, {
    fields: [pismeno.lawId],
    references: [zakon.id],
  }),
}));

export const bodRelations = relations(bod, ({ one }) => ({
  zakon: one(zakon, {
    fields: [bod.lawId],
    references: [zakon.id],
  }),
}));

export const prilohaRelations = relations(priloha, ({ one }) => ({
  zakon: one(zakon, {
    fields: [priloha.lawId],
    references: [zakon.id],
  }),
}));

export const poznamkaPodCarouRelations = relations(poznamka_pod_carou, ({ one }) => ({
  zakon: one(zakon, {
    fields: [poznamka_pod_carou.lawId],
    references: [zakon.id],
  }),
}));

export const unitNodeRelations = relations(unitNode, ({ one, many }) => ({
  zakon: one(zakon, { fields: [unitNode.lawId], references: [zakon.id] }),
  children: many(unitEdge, { relationName: 'edgeChildren' }),
  parent: many(unitEdge, { relationName: 'edgeParent' }),
}));

export const unitEdgeRelations = relations(unitEdge, ({ one }) => ({
  parentNode: one(unitNode, {
    fields: [unitEdge.parentNodeId],
    references: [unitNode.id],
    relationName: 'edgeParent',
  }),
  childNode: one(unitNode, {
    fields: [unitEdge.childNodeId],
    references: [unitNode.id],
    relationName: 'edgeChildren',
  }),
}));

export const unitTextRelations = relations(unitText, ({ one, many }) => ({
  node: one(unitNode, { fields: [unitText.nodeId], references: [unitNode.id] }),
  version: one(documentVersion, {
    fields: [unitText.documentVersionId],
    references: [documentVersion.id],
  }),
  chunks: many(unitChunk),
  crossrefs: many(crossref),
}));

export const unitChunkRelations = relations(unitChunk, ({ one }) => ({
  unitText: one(unitText, {
    fields: [unitChunk.unitTextId],
    references: [unitText.id],
  }),
}));

export const crossrefRelations = relations(crossref, ({ one }) => ({
  unitText: one(unitText, {
    fields: [crossref.unitTextId],
    references: [unitText.id],
  }),
}));
