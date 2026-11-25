import amaCattle from '../db/schema/ama_cattle';
import {
  isUserDataValid,
  isValidAddress,
  normalizeAddress,
  toPostalAddress,
} from '~~/shared/utils/utils';
import { CATTLE_LOGIN_PROVIDERS, COMMODITIES, STATUS_LABELS } from '~~/shared/utils/constants';

/** @typedef {import('./soap-traces').StatementInfo} StatementInfo */

/**
 * One entry per statement, the one with the highest version.
 * @param {Array<StatementInfo>} statements
 * @returns {Array<StatementInfo>}
 */
export function latestVersions(statements) {
  /** @type {Map<string, StatementInfo>} */
  const latest = new Map();
  for (const statement of statements) {
    const current = latest.get(statement.sdId);
    if (!current || (statement.version ?? 0) > (current.version ?? 0)) {
      latest.set(statement.sdId, statement);
    }
  }
  return [...latest.values()];
}

/**
 * @param {string} sdId
 * @param {string} userId
 * @returns {Promise<StatementInfo>} without internalReferenceNumber
 */
export async function requireOwnStatement(sdId, userId) {
  const { statements: sdInfos, error: sdError } = await retrieveSd([sdId]);
  if (sdError) {
    throw createError({ status: 500, statusMessage: 'Internal Server Error', message: sdError });
  }
  const [sdInfo] = latestVersions(sdInfos ?? []);
  // TRACES returns any statement submitted through our account, so only hand out the user's own.
  if (!sdInfo || sdInfo.internalReferenceNumber !== getInternalReferenceHash(userId)) {
    throw createError({
      status: 404,
      statusMessage: 'Not found',
      message: 'Diese Erklärung wurde nicht gefunden.',
    });
  }
  delete sdInfo.internalReferenceNumber;

  if (isInvalidated(sdInfo)) {
    throw createError({
      status: 404,
      statusMessage: 'Not found',
      message: 'Diese Erklärung ist im EU-Informationssystem TRACES nicht mehr verfügbar.',
    });
  }
  return sdInfo;
}

/**
 * TRACES only accepts updates and withdrawals of AVAILABLE statements.
 * @param {StatementInfo} sdInfo
 */
export function requireModifiable(sdInfo) {
  if (sdInfo.status !== 'AVAILABLE') {
    throw createError({
      status: 409,
      statusMessage: 'Conflict',
      message: `Diese Erklärung kann im Status „${STATUS_LABELS[sdInfo.status] ?? sdInfo.status}“ nicht geändert werden.`,
    });
  }
}

/**
 * Validates the submitting user and the statement, and normalizes the producer addresses.
 * @param {import('#auth-utils').UserSession} session
 * @param {import('./soap-traces').StatementPayload} statement
 * @returns {{ user: import('./soap-traces').User, cattleCount: number, lfbis: string | undefined }}
 */
export function validateStatement(session, statement) {
  const userId = /** @type {string} */ (session.user?.login);
  const secure = session.secure;
  const address = toPostalAddress(secure?.address);
  if (
    !secure ||
    !secure.name ||
    !address ||
    !secure.identifierType ||
    !secure.identifierValue ||
    !isUserDataValid({ ...secure, address }, session.loginProvider)
  ) {
    throw createError({
      status: 400,
      statusMessage: 'User is missing required fields',
      message: 'Bitte vervollständigen Sie unter "Mein Konto" die Angaben zum Betrieb.',
    });
  }
  /** @type {import('./soap-traces').User} */
  const user = {
    id: userId,
    name: secure.name,
    address: normalizeAddress(address),
    identifierType: secure.identifierType,
    identifierValue: secure.identifierValue,
  };

  const commodities = statement.commodities;
  if (commodities.some((c) => Object.values(c.quantity).some((v) => v < 0))) {
    throw createError({
      status: 400,
      statusMessage: 'Bad Request',
      message: 'Mengen dürfen nicht negativ sein.',
    });
  }
  for (const commodity of commodities) {
    // The postal address is only submitted when there is no geolocation, see getCommoditiesXML()
    const hasGeometry =
      commodity.geolocation && commodity.geojson?.features?.some((f) => f.geometry);
    if (hasGeometry || !commodity.address) {
      continue;
    }
    if (!isValidAddress(commodity.address)) {
      throw createError({
        status: 400,
        statusMessage: 'Bad Request',
        message: `Bitte überprüfen Sie die Postanschrift bei ${COMMODITIES[commodity.key]?.title ?? commodity.key}.`,
      });
    }
    commodity.address = normalizeAddress(commodity.address);
  }
  const cattleCount = getCattleCount(commodities);
  const lfbis = CATTLE_LOGIN_PROVIDERS.includes(session.loginProvider) ? secure.lfbis : undefined;
  if (cattleCount && !lfbis) {
    throw createError({
      status: 403,
      statusMessage: 'Forbidden',
      message: 'Die Erfassung von Rindern ist nur mit einem eAMA Login möglich.',
    });
  }
  return { user, cattleCount, lfbis };
}

/**
 * @param {Array<import('./soap-traces').PlainCommodityDataWithKey>} [commodities]
 * @returns {number}
 */
export function getCattleCount(commodities) {
  return (commodities ?? []).reduce((sum, c) => (c.quantity['0102'] || 0) + sum, 0);
}

/**
 * Queue the cattle count of a statement for transmission to AMA, replacing a queued earlier count.
 * @param {{ sdId: string, lfbis: string, count: number, referenceNumber?: string, verificationNumber?: string, date?: string }} entry
 * Numbers and date only for withdrawn statements, see the ama-cattle task.
 */
export async function queueCattle({
  sdId,
  lfbis,
  count,
  referenceNumber,
  verificationNumber,
  date,
}) {
  if (!process.env.AMA_CATTLE_PATH) {
    return;
  }
  const values = {
    lfbis,
    count,
    referenceNumber: referenceNumber ?? null,
    verificationNumber: verificationNumber ?? null,
    date: date ? new Date(date) : null,
  };
  await useDb()
    .insert(amaCattle)
    .values({ sdId, ...values })
    .onConflictDoUpdate({ target: amaCattle.sdId, set: values });
}
