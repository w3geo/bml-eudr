import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { eq, inArray, lt } from 'drizzle-orm';
import statementContents from '../db/schema/statement_contents';

// TRACES no longer returns the contents of a statement, so we keep an encrypted copy of what was
// submitted. The key is not stored in the database, so a database dump alone reveals nothing.

/** Copies are kept as long as operators have to keep their records (EUDR). */
export const RETENTION_YEARS = 5;

/**
 * @typedef {Object} StoredContents
 * @property {Array<import('./soap-traces').PlainCommodityDataWithKey>} commodities
 * @property {boolean} geolocationVisible
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey() {
  const key = Buffer.from(process.env.STATEMENT_CONTENTS_KEY ?? '', 'base64');
  if (key.length !== 32) {
    throw new Error('STATEMENT_CONTENTS_KEY must be 32 bytes, base64 encoded');
  }
  return key;
}

/**
 * The sdId is authenticated along with the data, so a copy cannot be moved to another statement.
 * @param {string} sdId
 * @param {StoredContents} contents
 * @returns {string}
 */
function encrypt(sdId, contents) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  cipher.setAAD(Buffer.from(sdId));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(contents), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

/**
 * @param {string} sdId
 * @param {string} data
 * @returns {StoredContents}
 */
function decrypt(sdId, data) {
  const buffer = Buffer.from(data, 'base64');
  const decipher = createDecipheriv(ALGORITHM, getKey(), buffer.subarray(0, IV_LENGTH));
  decipher.setAAD(Buffer.from(sdId));
  decipher.setAuthTag(buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH));
  const decrypted = Buffer.concat([
    decipher.update(buffer.subarray(IV_LENGTH + TAG_LENGTH)),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

/**
 * Whether TRACES no longer lists the identification number of a statement, e.g. because it was
 * withdrawn. Only statements still waiting for their number lack one legitimately.
 * @param {import('./soap-traces').StatementInfo} statement
 * @returns {boolean}
 */
export function isInvalidated(statement) {
  return !statement.referenceNumber && statement.status !== 'SUBMITTED';
}

/**
 * Store a copy of what was submitted for each commodity: the geolocation or the postal address,
 * whichever getCommoditiesXML() sent.
 * @param {string} sdId
 * @param {Array<import('./soap-traces').PlainCommodityDataWithKey>} commodities
 * @param {boolean} geolocationVisible
 */
export async function storeStatementContents(sdId, commodities, geolocationVisible) {
  /** @type {StoredContents} */
  const contents = {
    commodities: commodities.map((c) => {
      const usesGeolocation = c.geolocation && c.geojson?.features?.some((f) => f.geometry);
      return {
        key: c.key,
        quantity: c.quantity,
        geojson: usesGeolocation ? c.geojson : { type: 'FeatureCollection', features: [] },
        address: usesGeolocation ? null : (c.address ?? null),
      };
    }),
    geolocationVisible,
  };
  await useDb()
    .insert(statementContents)
    .values({ sdId, data: encrypt(sdId, contents) });
}

/**
 * @param {string} sdId
 * @returns {Promise<StoredContents|undefined>} undefined for statements submitted before copies
 * were kept
 */
export async function loadStatementContents(sdId) {
  const [row] = await useDb()
    .select()
    .from(statementContents)
    .where(eq(statementContents.sdId, sdId));
  return row ? decrypt(sdId, row.data) : undefined;
}

/**
 * @param {Array<string>} sdIds
 */
export async function deleteStatementContents(sdIds) {
  if (sdIds.length === 0) {
    return;
  }
  await useDb().delete(statementContents).where(inArray(statementContents.sdId, sdIds));
}

/**
 * Delete copies older than the retention period.
 */
export async function deleteExpiredStatementContents() {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);
  await useDb().delete(statementContents).where(lt(statementContents.createdAt, cutoff));
}

/**
 * @returns {Promise<Array<string>>}
 */
export async function listStatementContentIds() {
  const rows = await useDb().select({ sdId: statementContents.sdId }).from(statementContents);
  return rows.map((row) => row.sdId);
}
