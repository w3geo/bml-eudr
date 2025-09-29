import { pgTable, index, varchar } from 'drizzle-orm/pg-core';

const lfbisField = pgTable(
  'lfbis_field',
  {
    lfbis: varchar({ length: 10 }).notNull(),
    localId: varchar({ length: 25 }).notNull(),
  },
  (table) => [index('lfbisField_lfbis').on(table.lfbis)],
);

/** @typedef {import('drizzle-orm').InferSelectModel<lfbisField>} LfbisField */

export default lfbisField;
