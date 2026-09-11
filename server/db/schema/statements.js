import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import users from './users.js';

const statements = pgTable(
  'statements',
  {
    sdId: uuid().primaryKey(),
    userId: varchar({ length: 127 })
      .notNull()
      .references(() => users.id),
    date: timestamp().notNull(),
  },
  (table) => [uniqueIndex('statements_ddsId').on(table.sdId)],
);

/** @typedef {import('drizzle-orm').InferSelectModel<statements>} Statement */

export default statements;
