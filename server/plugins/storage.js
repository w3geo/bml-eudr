import { sql } from 'drizzle-orm';
import { defineDriver } from 'unstorage';

export default defineNitroPlugin(async () => {
  const storage = useStorage();

  const database = await useDbAsync();

  const driver = defineDriver((options) => {
    const database = options.database;
    /** @type {Promise<void>} */
    let setupPromise;
    function ensureTable() {
      if (!setupPromise) {
        setupPromise = (async () => {
          await database.execute(
            sql`CREATE TABLE IF NOT EXISTS unstorage (key TEXT PRIMARY KEY, value TEXT)`,
          );
        })();
      }
      return setupPromise;
    }

    return {
      name: 'drizzle',
      options,
      getInstance: () => database,
      async hasItem(key) {
        await ensureTable();
        const { rows } = await database.execute(
          sql`SELECT EXISTS (SELECT 1 FROM unstorage WHERE key = ${key}) AS value`,
        );
        return rows?.[0]?.value == '1';
      },
      async getItem(key) {
        await ensureTable();
        const { rows } = await database.execute(
          sql`SELECT value FROM unstorage WHERE key = ${key}`,
        );
        return rows?.[0]?.value ?? null;
      },
      async setItem(key, value) {
        await ensureTable();
        await database.execute(
          sql`INSERT INTO unstorage (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO UPDATE SET value = ${value}`,
        );
      },
      async removeItem(key) {
        await ensureTable();
        await database.execute(sql`DELETE FROM unstorage WHERE key = ${key}`);
      },
      async getKeys(base = '') {
        await ensureTable();
        const { rows } = await database.execute(
          sql`SELECT key FROM unstorage WHERE key LIKE ${base + '%'}`,
        );
        return rows?.map(/** @param {{key: string}} row */ (row) => row.key);
      },
      async clear(base) {
        await ensureTable();
        await database.execute(sql`DELETE FROM unstorage WHERE key LIKE ${base + '%'}`);
      },
    };
  })({ database });

  storage.mount('db', driver);
});
