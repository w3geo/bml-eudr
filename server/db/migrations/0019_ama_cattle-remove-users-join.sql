ALTER TABLE "ama_cattle" RENAME COLUMN "userId" TO "lfbis";--> statement-breakpoint
ALTER TABLE "ama_cattle" DROP CONSTRAINT "ama_cattle_userId_users_id_fk";
