ALTER TABLE "users" ALTER COLUMN "loginProvider" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email";