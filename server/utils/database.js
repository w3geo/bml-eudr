/** @typedef {import('drizzle-orm/node-postgres').NodePgDatabase | import('drizzle-orm/pglite').PgliteDatabase} DrizzleDb */

/** @type {(value: DrizzleDb) => void} */
let resolveDatabase;
/** @type {Promise<DrizzleDb>} */
const databaseAsync = new Promise((resolve) => {
  resolveDatabase = resolve;
});

/** @type {DrizzleDb} */
let database;

/**
 * @param {DrizzleDb} db
 */
export const setDatabase = (db) => {
  database = db;
  resolveDatabase(db);
};

/**
 * @returns {DrizzleDb}
 */
export const useDb = () => database;

export const useDbAsync = () => databaseAsync;
