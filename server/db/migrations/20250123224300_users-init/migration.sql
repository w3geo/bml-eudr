CREATE TABLE "users" (
	"id" varchar(127) PRIMARY KEY NOT NULL,
	"name" varchar(127) NOT NULL,
	"address" varchar(255) NOT NULL,
	"email" varchar(127),
	"emailVerified" boolean DEFAULT false NOT NULL,
	"identifierType" varchar(3),
	"identifierValue" varchar(15),
	"loginProvider" varchar(3) NOT NULL
);
