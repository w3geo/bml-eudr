import { numeric, pgTable, varchar } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: varchar({ length: 127 }).primaryKey(),
  name: varchar({ length: 127 }),
  address: varchar({ length: 255 }),
  email: varchar({ length: 127 }),
  identifierType: varchar({ enum: ['GLN', 'TIN', 'VAT'], length: 3 }),
  identifierValue: varchar({ length: 15 }),
  loginProvider: varchar({ enum: ['AMA', 'IDA', 'USP', 'OTP'], length: 3 }).notNull(),
  otp: numeric(),
  statementToken: varchar({ length: 20 }),
});

/** @typedef {import('drizzle-orm').InferSelectModel<users>} User */

export default users;
