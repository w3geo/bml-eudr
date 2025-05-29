import { boolean, pgTable, varchar } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: varchar({ length: 127 }).primaryKey(),
  name: varchar({ length: 127 }).notNull(),
  address: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 127 }),
  emailVerified: boolean().default(false).notNull(),
  identifierType: varchar({ enum: ['GLN', 'TIN', 'VAT'], length: 3 }),
  identifierValue: varchar({ length: 15 }),
  loginProvider: varchar({ enum: ['AMA', 'IDA'], length: 3 }).notNull(),
  cattleBreedingFarm: boolean(),
});

/** @typedef {import('drizzle-orm').InferSelectModel<users>} User */

export default users;
