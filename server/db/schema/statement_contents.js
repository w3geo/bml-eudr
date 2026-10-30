import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Deliberately without a reference to the user: statements are assigned to users only via
// TRACES (getSdByInternalReference).
const statementContents = pgTable('statement_contents', {
  sdId: uuid().primaryKey(),
  /** Encrypted JSON, see server/utils/statement-contents.js */
  data: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** @typedef {import('drizzle-orm').InferSelectModel<statementContents>} StatementContents */

export default statementContents;
