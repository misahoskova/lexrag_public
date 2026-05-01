ALTER TABLE "dil" RENAME COLUMN "lawId" TO "law_id";--> statement-breakpoint
ALTER TABLE "dil" DROP CONSTRAINT "dil_lawId_zakon_id_fk";
--> statement-breakpoint
DROP INDEX "dil_zakon_idx";--> statement-breakpoint
ALTER TABLE "dil" ADD CONSTRAINT "dil_law_id_zakon_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."zakon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dil_zakon_idx" ON "dil" USING btree ("law_id");