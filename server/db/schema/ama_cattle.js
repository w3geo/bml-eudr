import { pgTable, smallint, uuid, varchar } from 'drizzle-orm/pg-core';

const amaCattle = pgTable('ama_cattle', {
  ddsId: uuid().primaryKey(),
  lfbis: varchar({ length: 127 }).notNull(),
  count: smallint().notNull(),
});

/** @typedef {import('drizzle-orm').InferSelectModel<amaCattle>} AMACattle */

export default amaCattle;
