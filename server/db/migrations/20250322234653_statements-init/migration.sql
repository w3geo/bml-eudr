CREATE TABLE "statements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" varchar(127) NOT NULL,
	"statement" json,
	"referenceNumber" varchar(31),
	"verificationNumber" varchar(16),
	"created" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;