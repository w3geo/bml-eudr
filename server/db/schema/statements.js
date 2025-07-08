import { json, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import users from './users';

/**
 * @typedef {Object} StatementPayload
 * @property {Object<string, import('~/pages/statement.vue').CommodityData>} commodities
 * @property {boolean} geolocationVisible
 */

const statements = pgTable(
  'statements',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: varchar({ length: 127 })
      .notNull()
      .references(() => users.id),
    author: varchar({ length: 127 }).references(() => users.id),
    ddsId: uuid().unique(),
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
  },
  (table) => [uniqueIndex('statements_ddsId').on(table.ddsId)],
);

/** @typedef {import('drizzle-orm').InferSelectModel<statements>} Statement */
/** @typedef {'AVAILABLE' | 'SUBMITTED' | 'REJECTED' | 'CANCELLED' | 'WITHDRAWN' | 'ARCHIVED'} TracesStatus */

export default statements;
