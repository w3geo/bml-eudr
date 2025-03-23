import { json, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import users from './users';

const statements = pgTable('statements', {
  id: uuid().primaryKey(),
  userId: varchar({ length: 127 })
    .notNull()
    .references(() => users.id),
  statement: json(),
  referenceNumber: varchar({ length: 31 }),
  verificationNumber: varchar({ length: 16 }),
  created: timestamp().notNull(),
});

/** @typedef {import('drizzle-orm').InferSelectModel<statements>} Statement */

export default statements;
