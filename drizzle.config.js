import { defineConfig } from 'drizzle-kit';
import nuxtConfig from './nuxt.config.js';

const dialect = 'postgresql';
const schema = './server/db/schema';
const out = './server/db/migrations';

/** @type {import('drizzle-kit').Config} */
let config;
if (process.env.DATABASE_URL) {
  const postgresUrl = new URL(process.env.DATABASE_URL);
  config = {
    dialect,
    schema,
    out,
    dbCredentials: {
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
  };
} else {
  const url = /** @type {string} */ (nuxtConfig?.runtimeConfig?.pgliteDataDir);
  if (!url) {
    throw new Error('Missing runtimeConfig.pgliteDataDir in nuxt.config.js');
  }
  config = {
    dialect,
    schema,
    out,
    driver: 'pglite',
    dbCredentials: {
      url,
    },
  };
}

export default defineConfig(config);
