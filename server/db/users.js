export async function ensureTable() {
  const db = useDatabase();
  await db.sql`CREATE TABLE IF NOT EXISTS users ("id" TEXT PRIMARY KEY, "firstName" TEXT, "lastName" TEXT, "email" TEXT)`;
}

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 */

/**
 * @param {string} id
 * @returns {Promise<User|null>}
 */
export async function getUser(id) {
  await ensureTable();
  /** @type {{rows: Array<User>}} */
  const result = await useDatabase().sql`SELECT * FROM users WHERE id = ${id}`;
  console.log(result);
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
    .sql`INSERT INTO users (id, firstName, lastName, email) VALUES (${user.id}, ${user.firstName}, ${user.lastName}, ${user.email})`;
  return result.success;
}

export async function deleteUser(id) {
  await ensureTable();
  const result = await useDatabase().sql`DELETE FROM users WHERE id = ${id}`;
  console.log(result);
  return result;
}

export async function test() {
  putUser({
    id: 'id',
    firstName: 'foo',
    lastName: 'bar',
    email: 'email',
  });
  getUser('id');
  deleteUser('id');
}
