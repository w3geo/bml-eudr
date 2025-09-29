import { pgTable, index, varchar } from 'drizzle-orm/pg-core';

const lfbisFarm = pgTable(
  'lfbis_farm',
  {
    lfbis: varchar({ length: 10 }).notNull(),
    localId: varchar({ length: 25 }).notNull(),
  },
  (table) => [index('lfbisFarm_lfbis').on(table.lfbis)],
);

/** @typedef {import('drizzle-orm').InferSelectModel<lfbisFarm>} LfbisFarm */

export default lfbisFarm;
