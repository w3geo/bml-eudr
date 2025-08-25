import { pgTable, smallint, uuid, varchar } from 'drizzle-orm/pg-core';
import users from './users';

const amaCattle = pgTable('ama_cattle', {
  ddsId: uuid().primaryKey(),
  userId: varchar({ length: 127 })
    .notNull()
    .references(() => users.id),
  count: smallint().notNull(),
});

/** @typedef {import('drizzle-orm').InferSelectModel<amaCattle>} AMACattle */

export default amaCattle;
