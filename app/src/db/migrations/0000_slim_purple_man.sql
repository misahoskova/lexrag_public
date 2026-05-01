CREATE TYPE "public"."node_type" AS ENUM('ZAKON', 'CAST_ZAKONA', 'HLAVA', 'DIL', 'ODDIL', 'PODODDIL', 'PARAGRAF', 'ODSTAVEC', 'PISMENO', 'BOD', 'PRILOHA', 'POZNAMKA_POD_CAROU');--> statement-breakpoint
CREATE TABLE "bod" (
	"id" serial PRIMARY KEY NOT NULL,
	"law_id" integer NOT NULL,
	"marker" varchar(32),
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cast_zakona" (
	"id" serial PRIMARY KEY NOT NULL,
	"law_id" integer NOT NULL,
	"label" text,
	"marker" varchar(32),
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crossref" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_text_id" integer NOT NULL,
	"raw_text" text NOT NULL,
	"normalized" text,
	"target_node_id" uuid,
	"confidence" integer,
	"note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dil" (
	"id" serial PRIMARY KEY NOT NULL,
	"lawId" integer NOT NULL,
	"label" text,
	"marker" varchar(32),
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_version" (
	"id" serial PRIMARY KEY NOT NULL,
	"law_id" integer NOT NULL,
	"vyhlaseno_dne" date NOT NULL,
	"ucinne_od" date,
	"ucinne_do" date,
	"source_url" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hlava" (
	"id" serial PRIMARY KEY NOT NULL,
	"law_id" integer NOT NULL,
	"label" text,
	"marker" varchar(32),
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "oddil" (
	"id" serial PRIMARY KEY NOT NULL,
	"law_id" integer NOT NULL,
	"label" text,
	"marker" varchar(32),
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "odstavec" (
	"id" serial PRIMARY KEY NOT NULL,
	"law_id" integer NOT NULL,
	"marker" varchar(32),
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "paragraf" (
	"id" serial PRIMARY KEY NOT NULL,
	"law_id" integer NOT NULL,
	"label" text,
	"marker" varchar(32),
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pismeno" (
	"id" serial PRIMARY KEY NOT NULL,
	"law_id" integer NOT NULL,
	"marker" varchar(32),
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pododdil" (
	"id" serial PRIMARY KEY NOT NULL,
	"law_id" integer NOT NULL,
	"label" text,
	"marker" varchar(32),
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "poznamka_pod_carou" (
	"id" serial PRIMARY KEY NOT NULL,
	"law_id" integer NOT NULL,
	"marker" varchar(32) NOT NULL,
	"text" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priloha" (
	"id" serial PRIMARY KEY NOT NULL,
	"law_id" integer NOT NULL,
	"label" text,
	"marker" varchar(32),
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tabulka_prilohy" (
	"id" serial PRIMARY KEY NOT NULL,
	"priloha_node_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"columns_json" text NOT NULL,
	"rows_json" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "unit_chunk" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_text_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_type" varchar(16) NOT NULL,
	"marker" varchar(32),
	"token_count" integer NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"text" text NOT NULL,
	"text_with_context" text NOT NULL,
	"embedding" vector(1536),
	"tsv" "tsvector",
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "unit_context" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_text_id" integer NOT NULL,
	"breadcrumb" text NOT NULL,
	"law_title" text NOT NULL,
	"unit_label" text,
	"stale_url" text,
	"path_markers_json" text NOT NULL,
	"parent_node_ids_json" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "unit_edge" (
	"parent_node_id" uuid NOT NULL,
	"child_node_id" uuid NOT NULL,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_node" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "node_type" NOT NULL,
	"native_id" integer NOT NULL,
	"law_id" integer NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "unit_text" (
	"id" serial PRIMARY KEY NOT NULL,
	"node_id" uuid NOT NULL,
	"document_version_id" integer,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"text_raw" text NOT NULL,
	"text_with_context" text NOT NULL,
	"source_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "zakon" (
	"id" serial PRIMARY KEY NOT NULL,
	"cislo" integer NOT NULL,
	"rok" integer NOT NULL,
	"zkratka" text,
	"nazev" text NOT NULL,
	"stale_url" text,
	"source_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bod" ADD CONSTRAINT "bod_law_id_zakon_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cast_zakona" ADD CONSTRAINT "cast_zakona_law_id_zakon_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossref" ADD CONSTRAINT "crossref_unit_text_id_unit_text_id_fk" FOREIGN KEY ("unit_text_id") REFERENCES "public"."unit_text"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossref" ADD CONSTRAINT "crossref_target_node_id_unit_node_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."unit_node"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dil" ADD CONSTRAINT "dil_lawId_zakon_id_fk" FOREIGN KEY ("lawId") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_law_id_zakon_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hlava" ADD CONSTRAINT "hlava_law_id_zakon_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oddil" ADD CONSTRAINT "oddil_law_id_zakon_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odstavec" ADD CONSTRAINT "odstavec_law_id_zakon_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paragraf" ADD CONSTRAINT "paragraf_law_id_zakon_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pismeno" ADD CONSTRAINT "pismeno_law_id_zakon_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pododdil" ADD CONSTRAINT "pododdil_law_id_zakon_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poznamka_pod_carou" ADD CONSTRAINT "poznamka_pod_carou_law_id_zakon_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priloha" ADD CONSTRAINT "priloha_law_id_zakon_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabulka_prilohy" ADD CONSTRAINT "tabulka_prilohy_priloha_node_id_unit_node_id_fk" FOREIGN KEY ("priloha_node_id") REFERENCES "public"."unit_node"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_chunk" ADD CONSTRAINT "unit_chunk_unit_text_id_unit_text_id_fk" FOREIGN KEY ("unit_text_id") REFERENCES "public"."unit_text"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_context" ADD CONSTRAINT "unit_context_unit_text_id_unit_text_id_fk" FOREIGN KEY ("unit_text_id") REFERENCES "public"."unit_text"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_edge" ADD CONSTRAINT "unit_edge_parent_node_id_unit_node_id_fk" FOREIGN KEY ("parent_node_id") REFERENCES "public"."unit_node"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_edge" ADD CONSTRAINT "unit_edge_child_node_id_unit_node_id_fk" FOREIGN KEY ("child_node_id") REFERENCES "public"."unit_node"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_node" ADD CONSTRAINT "unit_node_law_id_zakon_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_text" ADD CONSTRAINT "unit_text_node_id_unit_node_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."unit_node"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_text" ADD CONSTRAINT "unit_text_document_version_id_document_version_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_version"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bod_zakon_idx" ON "bod" USING btree ("law_id");--> statement-breakpoint
CREATE INDEX "cast_zakon_idx" ON "cast_zakona" USING btree ("law_id");--> statement-breakpoint
CREATE INDEX "crossref_text_idx" ON "crossref" USING btree ("unit_text_id");--> statement-breakpoint
CREATE INDEX "crossref_target_idx" ON "crossref" USING btree ("target_node_id");--> statement-breakpoint
CREATE INDEX "dil_zakon_idx" ON "dil" USING btree ("lawId");--> statement-breakpoint
CREATE INDEX "document_version_zakon_idx" ON "document_version" USING btree ("law_id");--> statement-breakpoint
CREATE INDEX "document_version_effect_idx" ON "document_version" USING btree ("ucinne_od","ucinne_do");--> statement-breakpoint
CREATE INDEX "hlava_zakon_idx" ON "hlava" USING btree ("law_id");--> statement-breakpoint
CREATE INDEX "oddil_zakon_idx" ON "oddil" USING btree ("law_id");--> statement-breakpoint
CREATE INDEX "odst_zakon_idx" ON "odstavec" USING btree ("law_id");--> statement-breakpoint
CREATE INDEX "par_zakon_idx" ON "paragraf" USING btree ("law_id");--> statement-breakpoint
CREATE INDEX "par_marker_idx" ON "paragraf" USING btree ("law_id","marker");--> statement-breakpoint
CREATE INDEX "pism_zakon_idx" ON "pismeno" USING btree ("law_id");--> statement-breakpoint
CREATE INDEX "pododdil_zakon_idx" ON "pododdil" USING btree ("law_id");--> statement-breakpoint
CREATE INDEX "poznamka_pod_carou_zakon_idx" ON "poznamka_pod_carou" USING btree ("law_id");--> statement-breakpoint
CREATE INDEX "poznamka_pod_carou_marker_idx" ON "poznamka_pod_carou" USING btree ("law_id","marker");--> statement-breakpoint
CREATE INDEX "priloha_zakon_idx" ON "priloha" USING btree ("law_id");--> statement-breakpoint
CREATE INDEX "appendix_table_node_idx" ON "tabulka_prilohy" USING btree ("priloha_node_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "u_chunk" ON "unit_chunk" USING btree ("unit_text_id","chunk_index","valid_from");--> statement-breakpoint
CREATE INDEX "chunk_valid_idx" ON "unit_chunk" USING btree ("valid_from","valid_to");--> statement-breakpoint
CREATE INDEX "chunk_text_idx" ON "unit_chunk" USING btree ("unit_text_id");--> statement-breakpoint
CREATE INDEX "unit_context_text_idx" ON "unit_context" USING btree ("unit_text_id");--> statement-breakpoint
CREATE UNIQUE INDEX "u_edge_child" ON "unit_edge" USING btree ("child_node_id");--> statement-breakpoint
CREATE INDEX "edge_parent_idx" ON "unit_edge" USING btree ("parent_node_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "u_node_type_native" ON "unit_node" USING btree ("type","native_id");--> statement-breakpoint
CREATE INDEX "node_zakon_idx" ON "unit_node" USING btree ("law_id","depth","order_index");--> statement-breakpoint
CREATE INDEX "unit_text_node_idx" ON "unit_text" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "unit_text_version_idx" ON "unit_text" USING btree ("document_version_id");--> statement-breakpoint
CREATE INDEX "unit_text_valid_idx" ON "unit_text" USING btree ("valid_from","valid_to");--> statement-breakpoint
CREATE UNIQUE INDEX "u_text_node_from" ON "unit_text" USING btree ("node_id","valid_from");--> statement-breakpoint
CREATE UNIQUE INDEX "u_zakon_ci_rok" ON "zakon" USING btree ("cislo","rok");--> statement-breakpoint
CREATE INDEX "zakon_stale_url_idx" ON "zakon" USING btree ("stale_url");