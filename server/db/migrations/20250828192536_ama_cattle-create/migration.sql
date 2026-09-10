CREATE TABLE "ama_cattle" (
	"ddsId" uuid PRIMARY KEY NOT NULL,
	"userId" varchar(127) NOT NULL,
	"count" smallint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ama_cattle" ADD CONSTRAINT "ama_cattle_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;