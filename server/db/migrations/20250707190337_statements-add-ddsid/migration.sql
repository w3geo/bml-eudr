ALTER TABLE "statements" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "statements" ADD COLUMN "ddsId" uuid;--> statement-breakpoint
UPDATE "statements" SET "ddsId" = "id";