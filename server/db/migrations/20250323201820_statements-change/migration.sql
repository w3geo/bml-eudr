ALTER TABLE "statements" RENAME COLUMN "created" TO "date";--> statement-breakpoint
ALTER TABLE "statements" ALTER COLUMN "statement" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "statements" ALTER COLUMN "referenceNumber" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "statements" ALTER COLUMN "verificationNumber" SET DATA TYPE varchar(35);--> statement-breakpoint
ALTER TABLE "statements" ADD COLUMN "status" varchar(9);