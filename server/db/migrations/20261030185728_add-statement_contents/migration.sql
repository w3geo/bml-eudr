CREATE TABLE "statement_contents" (
	"sdId" uuid PRIMARY KEY,
	"data" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
