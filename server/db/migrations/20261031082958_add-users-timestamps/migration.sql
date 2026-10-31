ALTER TABLE "users" ADD COLUMN "createdAt" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lastLoginAt" timestamp with time zone;--> statement-breakpoint
-- Existing users count as logged in now, so none of them is deleted as unverified or inactive early
UPDATE "users" SET "lastLoginAt" = now();