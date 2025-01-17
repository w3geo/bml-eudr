import { boolean, pgTable, varchar } from 'drizzle-orm/pg-core';

export default pgTable('users', {
  id: varchar({ length: 127 }).primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  address: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }),
  emailVerified: boolean().default(false).notNull(),
  identifierType: varchar({ length: 15 }),
  identifierValue: varchar({ length: 15 }),
  loginProvider: varchar({ length: 15 }).notNull(),
});
