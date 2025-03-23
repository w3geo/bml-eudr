import { join } from 'path';
import { drizzle as postgresDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite';
import { migrate as postgresMigrate } from 'drizzle-orm/node-postgres/migrator';
import { migrate as pgliteMigrate } from 'drizzle-orm/pglite/migrator';
import { PGlite as PGliteClient } from '@electric-sql/pglite';
import { mkdirSync } from 'fs';

export default defineNitroPlugin(async () => {
  const migrationsFolder = join('server', 'db', 'migrations');

  try {
    if (process.env.DATABASE_URL) {
      const postgresUrl = new URL(process.env.DATABASE_URL);
      const db = postgresDrizzle({
        connection: {
          host: postgresUrl.hostname,
          port: parseInt(postgresUrl.port),
          user: postgresUrl.username,
          password: postgresUrl.password,
          database: postgresUrl.pathname.slice(1),
          ssl: {
            rejectUnauthorized: false,
            ca: process.env.DATABASE_CA_CERT,
          },
        },
      });
      await postgresMigrate(db, { migrationsFolder });
      setDatabase(db);
    } else {
      // local PGlite for development
      const dataDir = useRuntimeConfig().pgliteDataDir;
      mkdirSync(dataDir, { recursive: true });
      const client = new PGliteClient(dataDir);
      const db = pgliteDrizzle(client);
      await pgliteMigrate(db, { migrationsFolder });
      setDatabase(db);
    }
  } catch (error) {
    console.error('Error setting up database', error);
  }
});
