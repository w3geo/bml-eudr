import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import users from './users';

const statements = pgTable(
  'statements',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: varchar({ length: 127 })
      .notNull()
      .references(() => users.id),
    author: varchar({ length: 127 }).references(() => users.id),
    ddsId: uuid().unique(),
    date: timestamp().notNull(),
  },
  (table) => [uniqueIndex('statements_ddsId').on(table.ddsId)],
);

/** @typedef {import('drizzle-orm').InferSelectModel<statements>} Statement */

export default statements;
