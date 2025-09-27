DELETE FROM "statements" WHERE "author" IS NULL;--> statement-breakpoint
ALTER TABLE "statements" ALTER COLUMN "author" SET NOT NULL;