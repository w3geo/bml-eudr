import { pgTable, smallint, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

const amaCattle = pgTable('ama_cattle', {
  sdId: uuid().primaryKey(),
  lfbis: varchar({ length: 127 }).notNull(),
  count: smallint().notNull(),
  // Set for withdrawn statements, which TRACES no longer lists with their numbers
  referenceNumber: varchar({ length: 255 }),
  verificationNumber: varchar({ length: 255 }),
  date: timestamp({ withTimezone: true }),
});

/** @typedef {import('drizzle-orm').InferSelectModel<amaCattle>} AMACattle */

export default amaCattle;
