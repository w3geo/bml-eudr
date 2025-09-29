CREATE TABLE "lfbis_farm" (
	"lfbis" varchar(10) NOT NULL,
	"farm" varchar(10) NOT NULL,
	CONSTRAINT "lfbis_farm_farm_unique" UNIQUE("farm")
);
--> statement-breakpoint
CREATE TABLE "lfbis_field" (
	"lfbis" varchar(10) NOT NULL,
	"field" varchar(10) NOT NULL,
	CONSTRAINT "lfbis_field_field_unique" UNIQUE("field")
);
--> statement-breakpoint
CREATE INDEX "lfbisFarm_lfbis" ON "lfbis_farm" USING btree ("lfbis");--> statement-breakpoint
CREATE INDEX "lfbisField_lfbis" ON "lfbis_field" USING btree ("lfbis");