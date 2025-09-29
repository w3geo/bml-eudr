ALTER TABLE "lfbis_farm" RENAME COLUMN "farm" TO "localId";--> statement-breakpoint
ALTER TABLE "lfbis_field" RENAME COLUMN "field" TO "localId";--> statement-breakpoint
ALTER TABLE "lfbis_farm" DROP CONSTRAINT "lfbis_farm_farm_unique";--> statement-breakpoint
ALTER TABLE "lfbis_field" DROP CONSTRAINT "lfbis_field_field_unique";--> statement-breakpoint
ALTER TABLE "lfbis_farm" ADD CONSTRAINT "lfbis_farm_localId_unique" UNIQUE("localId");--> statement-breakpoint
ALTER TABLE "lfbis_field" ADD CONSTRAINT "lfbis_field_localId_unique" UNIQUE("localId");