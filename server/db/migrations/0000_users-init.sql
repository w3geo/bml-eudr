CREATE TABLE "users" (
	"id" varchar(127) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(255) NOT NULL,
	"email" varchar(255),
	"emailVerified" boolean DEFAULT false NOT NULL,
	"identifierType" varchar(15),
	"identifierValue" varchar(15),
	"loginProvider" varchar(15) NOT NULL
);
