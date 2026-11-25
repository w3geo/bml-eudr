ALTER TABLE "ama_cattle" ADD COLUMN "referenceNumber" varchar(255);--> statement-breakpoint
ALTER TABLE "ama_cattle" ADD COLUMN "verificationNumber" varchar(255);--> statement-breakpoint
ALTER TABLE "ama_cattle" ADD COLUMN "date" timestamp with time zone;