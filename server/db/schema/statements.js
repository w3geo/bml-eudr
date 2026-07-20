import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import users from './users';

// Table for statements created on behalf of another user
const statements = pgTable(
  'statements',
  {
    sdId: uuid().primaryKey(),
    userId: varchar({ length: 127 })
      .notNull()
      .references(() => users.id),
    authorName: varchar({ length: 127 }).notNull(),
    authorAddress: varchar({ length: 255 }).notNull(),
    date: timestamp().notNull(),
  },
  (table) => [uniqueIndex('statements_ddsId').on(table.sdId)],
);

/** @typedef {import('drizzle-orm').InferSelectModel<statements>} Statement */

export default statements;
