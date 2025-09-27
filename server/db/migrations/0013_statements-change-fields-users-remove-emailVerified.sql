ALTER TABLE "statements" DROP CONSTRAINT "statements_ddsId_unique";--> statement-breakpoint
ALTER TABLE "statements" DROP CONSTRAINT "statements_author_users_id_fk";--> statement-breakpoint
ALTER TABLE "statements" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "statements" ADD PRIMARY KEY ("ddsId");--> statement-breakpoint
ALTER TABLE "statements" ALTER COLUMN "ddsId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "statements" ADD COLUMN "authorName" varchar(127) NOT NULL;--> statement-breakpoint
ALTER TABLE "statements" ADD COLUMN "authorAddress" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "statements" DROP COLUMN "author";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "emailVerified";