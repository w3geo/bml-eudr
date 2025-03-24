import { json, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import users from './users';

/**
 * @typedef {Object} StatementPayload
 * @property {Object<string, import('~/pages/statement.vue').CommodityData>} commodities
 * @property {boolean} geolocationVisible
 */

const statements = pgTable('statements', {
  id: uuid().primaryKey(),
  userId: varchar({ length: 127 })
    .notNull()
    .references(() => users.id),
  statement:
    /** @type {import('drizzle-orm').NotNull<import('drizzle-orm').$Type<import('drizzle-orm/pg-core').PgJsonBuilderInitial<"">, StatementPayload>>} */ (
      json().notNull()
    ),
  referenceNumber: varchar({ length: 50 }),
  verificationNumber: varchar({ length: 35 }),
  status: varchar({
    enum: ['AVAILABLE', 'SUBMITTED', 'REJECTED', 'CANCELLED', 'WITHDRAWN', 'ARCHIVED'],
    length: 9,
  }),
  date: timestamp().notNull(),
});

/** @typedef {import('drizzle-orm').InferSelectModel<statements>} Statement */
/** @typedef {'AVAILABLE' | 'SUBMITTED' | 'REJECTED' | 'CANCELLED' | 'WITHDRAWN' | 'ARCHIVED'} TracesStatus */

export default statements;
