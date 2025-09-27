DELETE FROM "statements" WHERE "author" IS NULL;
ALTER TABLE "statements" ALTER COLUMN "author" SET NOT NULL;