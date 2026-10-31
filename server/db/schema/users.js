import { numeric, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: varchar({ length: 127 }).primaryKey(),
  name: varchar({ length: 127 }),
  address: varchar({ length: 255 }),
  identifierType: varchar({ enum: ['GLN', 'TIN', 'VAT', 'ONI'], length: 3 }),
  identifierValue: varchar({ length: 15 }),
  loginProvider: varchar({ enum: ['AMA', 'IDA', 'USP', 'OTP', 'SMS'], length: 3 }),
  otp: numeric(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  /** null until the first successful login, e.g. when only an OTP code was requested */
  lastLoginAt: timestamp({ withTimezone: true }),
});

/** @typedef {import('drizzle-orm').InferSelectModel<users>} User */

export default users;
