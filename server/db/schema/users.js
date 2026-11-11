import { numeric, pgTable, smallint, timestamp, varchar } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: varchar({ length: 127 }).primaryKey(),
  name: varchar({ length: 127 }),
  address: varchar({ length: 255 }),
  identifierType: varchar({ enum: ['GLN', 'TIN', 'VAT', 'ONI'], length: 3 }),
  identifierValue: varchar({ length: 15 }),
  loginProvider: varchar({ enum: ['AMA', 'IDA', 'USP', 'OTP', 'SMS'], length: 3 }),
  otp: numeric(),
  otpExpiresAt: timestamp({ withTimezone: true }),
  /** Verification attempts for the current `otp`, including the successful one */
  otpAttempts: smallint().notNull().default(0),
  /** When the last code was sent, for the minimum time between codes */
  otpRequestedAt: timestamp({ withTimezone: true }),
  /** Start of the window in which `otpRequestCount` codes were sent */
  otpRequestWindowStart: timestamp({ withTimezone: true }),
  otpRequestCount: smallint().notNull().default(0),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  /** null until the first successful login, e.g. when only an OTP code was requested */
  lastLoginAt: timestamp({ withTimezone: true }),
});

/** @typedef {import('drizzle-orm').InferSelectModel<users>} User */

export default users;
