export async function ensureTable() {
  const db = useDatabase();
  await db.sql`CREATE TABLE IF NOT EXISTS users ("id" TEXT PRIMARY KEY, "name" TEXT, "address" TEXT, "email" TEXT, "emailverified" NUMERIC, "identifiertype" TEXT, "identifiervalue" TEXT, "loginprovider" TEXT)`;
}

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} address
 * @property {string|null} email
 * @property {1 | 0} emailverified
 * @property {string | null} identifiertype
 * @property {string | null} identifiervalue
 * @property {'AMA' | 'IDAustria'} loginprovider
 */

/**
 * @param {string} id
 * @returns {Promise<User|null>}
 */
export async function getUser(id) {
  await ensureTable();
  /** @type {{rows: Array<User>}} */
  const result = await useDatabase().sql`SELECT * FROM users WHERE id = ${id}`;
  const { rows } = result;
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * @param {User} user
 * @returns {Promise<boolean>}
 */
export async function putUser(user) {
  await ensureTable();
  /** @type {{success: boolean}} */
  const result = await useDatabase()
    .sql`INSERT INTO users (id, name, address, email, emailverified, identifiertype, identifiervalue, loginprovider) VALUES (${user.id}, ${user.name}, ${user.address}, ${user.email}, ${user.emailverified}, ${user.identifiertype}, ${user.identifiervalue}, ${user.loginprovider}) ON CONFLICT(id) DO UPDATE SET name = ${user.name}, address = ${user.address}, email = ${user.email}, emailverified = ${user.emailverified}, identifiertype = ${user.identifiertype}, identifiervalue = ${user.identifiervalue}, loginprovider = ${user.loginprovider}`;
  return result.success;
}

/**
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteUser(id) {
  await ensureTable();
  /** @type {{success: boolean}} */
  const result = await useDatabase().sql`DELETE FROM users WHERE id = ${id}`;
  return result.success;
}
