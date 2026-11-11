ALTER TABLE "users" ADD COLUMN "otpExpiresAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "otpAttempts" smallint DEFAULT 0 NOT NULL;