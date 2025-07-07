CREATE UNIQUE INDEX "statements_ddsId" ON "statements" USING btree ("ddsId");--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_ddsId_unique" UNIQUE("ddsId");