CREATE TABLE "poznamka_reference" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_text_id" integer NOT NULL,
	"poznamka_node_id" uuid,
	"raw_text" varchar(32),
	"marker" varchar(32),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "poznamka_reference" ADD CONSTRAINT "poznamka_reference_unit_text_id_unit_text_id_fk" FOREIGN KEY ("unit_text_id") REFERENCES "public"."unit_text"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poznamka_reference" ADD CONSTRAINT "poznamka_reference_poznamka_node_id_unit_node_id_fk" FOREIGN KEY ("poznamka_node_id") REFERENCES "public"."unit_node"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "poznamka_ref_text_idx" ON "poznamka_reference" USING btree ("unit_text_id");--> statement-breakpoint
CREATE INDEX "poznamka_ref_node_idx" ON "poznamka_reference" USING btree ("poznamka_node_id");