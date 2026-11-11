ALTER TABLE "users" ADD COLUMN "otpRequestedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "otpRequestWindowStart" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "otpRequestCount" smallint DEFAULT 0 NOT NULL;