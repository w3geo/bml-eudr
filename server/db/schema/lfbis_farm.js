import { pgTable, index, varchar } from 'drizzle-orm/pg-core';

const lfbisFarm = pgTable(
  'lfbis_farm',
  {
    lfbis: varchar({ length: 10 }).notNull(),
    farm: varchar({ length: 10 }).unique().notNull(),
  },
  (table) => [index('lfbisFarm_lfbis').on(table.lfbis)],
);

/** @typedef {import('drizzle-orm').InferSelectModel<lfbisFarm>} LfbisFarm */

export default lfbisFarm;
