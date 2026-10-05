import { randomBytes, createHash } from 'crypto';
import { DOMParser } from '@xmldom/xmldom';
import { unref } from 'vue';
import { COMMODITIES, HS_HEADING, LEGACY_HS_HEADING } from '~~/shared/utils/constants.js';
import { parseAddress } from '~~/shared/utils/utils.js';

/** @typedef {'AVAILABLE' | 'SUBMITTED' | 'REJECTED' | 'WITHDRAWN' | 'ARCHIVED' | 'SUSPENDED' | 'UPDATED' | 'GROUPED' | 'OBSOLETE' | 'UNKNOWN'} TracesStatus */

/** @typedef {{id: string, name: string, address: string, identifierType: import('~/utils/utils').IdentifierType, identifierValue: string}} User */

/**
 * @typedef {Object} StatementInfo
 * @property {string} sdId
 * @property {string} [internalReferenceNumber] Hash of the submitting user's login id, see getInternalReferenceHash()
 * @property {string} [referenceNumber]
 * @property {string} [verificationNumber]
 * @property {TracesStatus} status
 * @property {string} date
 * @property {Array<CommodityDataWithKey>} [commodities]
 * @property {string} [commoditiesSummary] Short summary of commodities (for display in list)
 */

/**
 * @typedef {Object} StatementPayload
 * @property {Array<CommodityDataWithKey>} commodities
 * @property {boolean} geolocationVisible
 */

/** @typedef {StatementInfo & StatementPayload} StatementData */

/**
 * @typedef {Object} CommodityData
 * @property {import('~/composables/useStatement').Quantity|import('vue').Ref<import('~/composables/useStatement').Quantity>} quantity
 * @property {import('geojson').FeatureCollection<import('geojson').Geometry | null>|import('vue').Ref<import('geojson').FeatureCollection<import('geojson').Geometry | null>>} geojson
 * @property {import('~/composables/useStatement').Address|import('vue').Ref<import('~/composables/useStatement').Address>} [address] Override for the producer postal address; defaults to the user's address.
 * @property {boolean|import('vue').Ref<boolean>} [geolocation] Whether the drawn geolocation ("Geolokalisation") is submitted as the producer location instead of the postal address ("Postanschrift").
 */

/**
 * @typedef {{key: import('~~/shared/utils/constants.js').Commodity} & CommodityData} CommodityDataWithKey
 */

// TRACES API Specification and documentation:
// https://circabc.europa.eu/ui/group/34861680-e799-4d7c-bbad-da83c45da458/library/3819b9e2-b889-4714-9bb3-b4dde1ebe649

const errorNS = 'http://ec.europa.eu/sanco/tracesnt/error/v01';
const sdNS = 'http://ec.europa.eu/tracesnt/certificate/eudr/simplified-declaration/v3';
const commonNS = 'http://ec.europa.eu/tracesnt/certificate/eudr/common/v3';
// WSDL quirk: submitSd/updateSd/withdrawSd carry a SOAPAction in the simplified-declaration
// namespace, but the getSd* operations carry one in the due-diligence-statement namespace.
// Verified against the published EUDRSimplifiedDeclarationServiceV3 WSDL.
const ddsNS = 'http://ec.europa.eu/tracesnt/certificate/eudr/due-diligence-statement/v3';
// WSDL (drop "acceptance." for production):
// https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRSimplifiedDeclarationServiceV3?wsdl
// In the schema, `referenceNumber` is the "declaration identifier" (Identifikationsnummer) of a
// simplified declaration; `uuid`/`sdIdentifier` is the technical TRACES id.
const tracesV3Endpoint = `${process.env.TRACES_WS_URL}EUDRSimplifiedDeclarationServiceV3`;
const soapEnvNS = 'http://schemas.xmlsoap.org/soap/envelope/';

// TRACES limits: 5 calls/s per IP, 10,000 calls/min globally (Operator API Reference v1.2, §2.3).
// Experiments showed bursts beyond that being slowed down rather than rejected, and the spec
// does not document a throttled response, so anything that looks like an overloaded or
// unreachable service is treated as "busy".
const READ_TIMEOUT = 10000;
const SUBMIT_TIMEOUT = 30000;
const READ_ATTEMPTS = 3;
const MAX_RETRY_DELAY = 5000;
// Messages returned as `error` or thrown by this module are complete sentences shown to the user
// as they are, including advice on what to do next. They name "das EU-Informationssystem TRACES"
// so users can tell that the problem is on the EU side.
const BUSY_MESSAGE =
  'Das EU-Informationssystem TRACES ist derzeit überlastet oder nicht erreichbar. Bitte versuchen Sie es in ein paar Minuten erneut.';
const SUBMIT_UNCERTAIN_MESSAGE =
  'Das EU-Informationssystem TRACES hat nicht rechtzeitig geantwortet. Möglicherweise wurde die Erklärung trotzdem erstellt. Bitte prüfen Sie unter "Mein Konto" — "Meine Identifikationsnummern", ob sie dort aufscheint, bevor Sie es erneut versuchen.';
export const UNEXPECTED_MESSAGE =
  'Das EU-Informationssystem TRACES hat eine unerwartete Antwort geliefert. Bitte versuchen Sie es später erneut.';

/**
 * @param {string} text
 * @returns {import('@xmldom/xmldom').Document | null} null if the text is not XML
 */
function parseXml(text) {
  try {
    return new DOMParser({ onError: () => {} }).parseFromString(text, 'text/xml');
  } catch {
    return null;
  }
}

/**
 * Error message from a SOAP fault, or an empty string if there is none.
 * @param {import('@xmldom/xmldom').Document} xml
 * @returns {string}
 */
function getFaultMessage(xml) {
  const faultString = xml.getElementsByTagName('faultstring').item(0)?.textContent;
  const message = xml.getElementsByTagNameNS(errorNS, 'Message').item(0)?.textContent;
  const detail = [faultString, message]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(': ');
  return detail ? `Das EU-Informationssystem TRACES meldet einen Fehler: „${detail}“.` : '';
}

/**
 * @param {number} attempt 1-based attempt that just failed
 * @param {string | null} [retryAfter] Retry-After header value
 * @returns {number} ms
 */
function getRetryDelay(attempt, retryAfter) {
  const seconds = Number(retryAfter);
  if (retryAfter && Number.isFinite(seconds)) {
    return Math.min(seconds * 1000, MAX_RETRY_DELAY);
  }
  return Math.min(1000 * 2 ** (attempt - 1) + Math.random() * 500, MAX_RETRY_DELAY);
}

/**
 * Send a SOAP request to TRACES.
 *
 * Throws a 500 error with a user-facing message when TRACES is busy or unreachable: HTTP 429/502/503/504, a 5xx response
 * without a SOAP envelope (e.g. from a proxy), a network error or a timeout. SOAP faults are
 * not errors here - TRACES sends every fault with HTTP 500, and callers inspect them.
 *
 * Reads are retried with backoff, except after a timeout, because retrying would only add
 * load to an already slow service. Submits are never retried, because a request that failed
 * this way may still have been processed.
 * @param {string} soapAction
 * @param {() => string} getBody Called per attempt, so every attempt gets a fresh nonce and timestamp
 * @param {{ submit?: boolean }} [options]
 * @returns {Promise<{ status: number, text: string, xml: import('@xmldom/xmldom').Document | null }>}
 */
async function tracesRequest(soapAction, getBody, { submit = false } = {}) {
  const attempts = submit ? 1 : READ_ATTEMPTS;
  const action = soapAction.split('/').pop();
  for (let attempt = 1; ; attempt++) {
    /** @type {string} */
    let reason;
    /** @type {string | null} */
    let retryAfter = null;
    let timedOut = false;
    // A 429 or 503 means the request was turned away; anything else may have been processed.
    let rejected = false;
    try {
      const response = await fetch(tracesV3Endpoint, {
        method: 'POST',
        body: getBody(),
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': soapAction,
        },
        signal: AbortSignal.timeout(submit ? SUBMIT_TIMEOUT : READ_TIMEOUT),
      });
      const text = await response.text();
      const xml = parseXml(text);
      const isSoap = !!xml?.getElementsByTagNameNS(soapEnvNS, 'Envelope').length;
      const busy =
        [429, 502, 503, 504].includes(response.status) || (response.status >= 500 && !isSoap);
      if (!busy) {
        return { status: response.status, text, xml };
      }
      reason = `HTTP ${response.status}`;
      retryAfter = response.headers.get('retry-after');
      rejected = response.status === 429 || response.status === 503;
    } catch (error) {
      timedOut = error instanceof Error && error.name === 'TimeoutError';
      reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }

    console.error(`TRACES ${action} unavailable (attempt ${attempt}/${attempts}): ${reason}`);
    if (attempt >= attempts || timedOut) {
      // Not 503: DigitalOcean App Platform replaces an app's 503 response with its own error page
      // (and status 504), so the message would never reach the user.
      throw createError({
        status: 500,
        statusMessage: 'TRACES Unavailable',
        message: submit && !rejected ? SUBMIT_UNCERTAIN_MESSAGE : BUSY_MESSAGE,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, getRetryDelay(attempt, retryAfter)));
  }
}

/**
 * Escape a value for use as XML text content.
 * @param {string|number} value
 * @returns {string}
 */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Generate Nonce
 * @returns {string}
 */
function generateNonce() {
  return randomBytes(16).toString('base64');
}

/**
 * Get a hash representing the unique login id, because TRACES' internal reference numbers
 * are limited to 14 characters.
 * @param {string} id
 * @returns {string}
 */
export function getInternalReferenceHash(id) {
  const hash = createHash('sha256').update(String(id)).digest('hex');
  return BigInt(`0x${hash}`).toString(36).slice(0, 14);
}

/**
 * Get current timestamp in UTC format
 * @returns {string}
 */
function getCreated() {
  return new Date().toISOString();
}

/**
 * Generate Expires timestamp (20 seconds after Created)
 * @param {string} created
 * @returns {string}
 */
function getExpires(created) {
  const createdDate = new Date(created);
  createdDate.setSeconds(createdDate.getSeconds() + 20); // Set expiration to 20 seconds later
  return createdDate.toISOString();
}

/**
 * Generate Password Digest
 * @param {string} nonce
 * @param {string} created
 * @param {string} [password]
 * @returns {string}
 */
function generatePasswordDigest(nonce, created, password = '') {
  let pd = Int8Array.from([
    ...Int8Array.from(Buffer.from(nonce, 'base64')),
    ...Int8Array.from(Buffer.from(created)),
    ...Int8Array.from(Buffer.from(password)),
  ]);
  return createHash('sha1').update(pd).digest('base64');
}

function getHeader() {
  const username = process.env.TRACES_USERNAME;
  const password = process.env.TRACES_AUTHKEY;
  const nonce = generateNonce();
  const created = getCreated();
  const expires = getExpires(created);
  const passwordDigest = generatePasswordDigest(nonce, created, password);
  return `
    <soapenv:Header>
      <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
        xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" soapenv:mustUnderstand="1">
        <wsu:Timestamp wsu:Id="TS">
          <wsu:Created>${created}</wsu:Created>
          <wsu:Expires>${expires}</wsu:Expires>
        </wsu:Timestamp>
        <wsse:UsernameToken wsu:Id="UsernameToken">
          <wsse:Username>${username}</wsse:Username>
          <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${passwordDigest}</wsse:Password>
          <wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonce}</wsse:Nonce>
          <wsu:Created>${created}</wsu:Created>
        </wsse:UsernameToken>
      </wsse:Security>
      <v4:WebServiceClientId>${process.env.TRACES_WS_CLIENT_ID}</v4:WebServiceClientId>
    </soapenv:Header>`;
}

/**
 * @param {Array<CommodityDataWithKey>} commodities
 */
function getCommoditiesXML(commodities) {
  const commodityXMLs = [];
  for (const commodity of commodities) {
    const geojson = unref(commodity.geojson);
    const key = commodity.key;
    const producerAddress = unref(commodity.address);
    const hsCodes = /** @type {Array<import('~~/shared/utils/constants').HSCode>} */ (
      Object.keys(commodity.quantity)
    );
    for (const hsCode of hsCodes) {
      const quantity = /** @type {number} */ (unref(commodity.quantity)[hsCode]);
      if (!quantity) {
        continue;
      }

      const quantityUnits =
        COMMODITIES[/** @type {import('~~/shared/utils/constants.js').Commodity} */ (key)].units;

      /** @type {string} */
      let quantityInfo;
      // netWeight is only mandatory for IMPORT/EXPORT; for DOMESTIC a supplementary
      // unit alone is a valid quantity.
      switch (quantityUnits) {
        case 'm³':
          quantityInfo = `
          <eudrCommon:supplementaryUnit>${quantity}</eudrCommon:supplementaryUnit>
          <eudrCommon:supplementaryUnitQualifier>MTQ</eudrCommon:supplementaryUnitQualifier>
        `;
          break;
        case 't':
          quantityInfo = `<eudrCommon:netWeight>${quantity * 1000}</eudrCommon:netWeight>`; // kg, converted from t
          break;
        case 'Stk.': // NAR - number of articles
          quantityInfo = `
          <eudrCommon:supplementaryUnit>${quantity}</eudrCommon:supplementaryUnit>
          <eudrCommon:supplementaryUnitQualifier>NAR</eudrCommon:supplementaryUnitQualifier>
        `;
          break;
        default:
          throw new Error('Invalid quantity units');
      }

      const descriptor = `
        <sd:descriptors>
          <eudrCommon:descriptionOfGoods>${HS_HEADING[hsCode]}</eudrCommon:descriptionOfGoods>
          <eudrCommon:goodsMeasure>
            ${quantityInfo}
          </eudrCommon:goodsMeasure>
        </sd:descriptors>`;
      const hsHeading = `<sd:hsHeading>${hsCode}</sd:hsHeading>`;

      const hasGeometry =
        unref(commodity.geolocation) && geojson?.features?.some((f) => f.geometry);
      const producerLocation = hasGeometry
        ? `<sd:producerLocation>
              <sd:geometryGeojson>${btoa(JSON.stringify(geojson))}</sd:geometryGeojson>
            </sd:producerLocation>`
        : producerAddress
          ? `<sd:producerLocation>
              <sd:postalAddress>
                <sd:producerStreet>${escapeXml(producerAddress.street)}</sd:producerStreet>
                <sd:producerPostalCode>${escapeXml(producerAddress.postalCode)}</sd:producerPostalCode>
                <sd:producerCity>${escapeXml(producerAddress.city)}</sd:producerCity>
              </sd:postalAddress>
            </sd:producerLocation>`
          : '';

      commodityXMLs.push(`
        <sd:commodities>
          ${descriptor}
          ${hsHeading}
          <sd:producers>
            <sd:producerCountry>AT</sd:producerCountry>
            ${producerLocation}
          </sd:producers>
        </sd:commodities>`);
    }
  }
  return commodityXMLs.join('\n');
}

/**
 * @param {Array<CommodityDataWithKey>} commodities
 * @param {boolean} geolocationVisible
 * @param {User} user
 * @returns {string}
 */
function getSubmitSdXML(commodities, geolocationVisible, user) {
  const parsedAddress = parseAddress(user.address);
  const commoditiesXML = getCommoditiesXML(commodities);
  const operatorAddress = parsedAddress
    ? `<eudrCommon:operatorAddress>
                <eudrCommon:country>AT</eudrCommon:country>
                <eudrCommon:street>${escapeXml(parsedAddress.street)}</eudrCommon:street>
                <eudrCommon:postalCode>${escapeXml(parsedAddress.postalCode)}</eudrCommon:postalCode>
                <eudrCommon:city>${escapeXml(parsedAddress.city)}</eudrCommon:city>
              </eudrCommon:operatorAddress>`
    : '';
  // TIN may have been entered with blanks or slashes (e.g. "12 345/6789"), TRACES wants digits only
  const identifierValue =
    user.identifierType === 'TIN' ? user.identifierValue?.replace(/\D/g, '') : user.identifierValue;
  const representedOperatorXML = `<sd:representedOperator>
              <eudrCommon:operatorReferenceNumber>
                <eudrCommon:identifierType>${escapeXml(user.identifierType?.toLowerCase())}</eudrCommon:identifierType>
                <eudrCommon:identifierValue>${escapeXml(identifierValue)}</eudrCommon:identifierValue>
              </eudrCommon:operatorReferenceNumber>
              ${operatorAddress}
              <eudrCommon:operatorName>${escapeXml(user.name)}</eudrCommon:operatorName>
            </sd:representedOperator>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:sd="http://ec.europa.eu/tracesnt/certificate/eudr/simplified-declaration/v3"
      xmlns:eudrCommon="http://ec.europa.eu/tracesnt/certificate/eudr/common/v3"
      xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
      ${getHeader()}
      <soapenv:Body>
        <sd:SubmitSdRequest>
          <sd:operatorRole>REPRESENTATIVE_MSPO</sd:operatorRole>
          <sd:statement>
            <sd:internalReferenceNumber>${getInternalReferenceHash(user.id)}</sd:internalReferenceNumber>
            <sd:activityType>DOMESTIC</sd:activityType>
            ${representedOperatorXML}
            <sd:countryOfActivity>AT</sd:countryOfActivity>
            ${commoditiesXML}
            <sd:geoLocationConfidential>${!geolocationVisible}</sd:geoLocationConfidential>
          </sd:statement>
        </sd:SubmitSdRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;
}

/**
 * @param {Array<string>} sdIds TRACES UUIDs
 * @returns {string}
 */
function getRetrieveSdXML(sdIds) {
  const uuidListXML = sdIds
    .map(
      (id) =>
        `<sd:uuidAndVersionNumberList><eudrCommon:uuid>${escapeXml(id)}</eudrCommon:uuid></sd:uuidAndVersionNumberList>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:sd="http://ec.europa.eu/tracesnt/certificate/eudr/simplified-declaration/v3"
      xmlns:eudrCommon="http://ec.europa.eu/tracesnt/certificate/eudr/common/v3"
      xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
      ${getHeader()}
      <soapenv:Body>
        <sd:GetSdRequest>
          ${uuidListXML}
        </sd:GetSdRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;
}

/**
 * @param {Array<CommodityDataWithKey>} commodities
 * @param {boolean} geolocationVisible
 * @param {User} user
 * @returns {Promise<{ sdId: string | undefined, error: string | undefined }>}
 */
export async function submitSD(commodities, geolocationVisible, user) {
  if (!user) {
    throw new Error('User is required for SD submission');
  }
  const body = getSubmitSdXML(commodities, geolocationVisible, user);
  const { status, text, xml } = await tracesRequest(`${sdNS}/submitSd`, () => body, {
    submit: true,
  });
  const error = xml ? getFaultMessage(xml) : '';
  if (status >= 400 || !xml) {
    console.error('TRACES submit error:', text, 'body:', body);
    return {
      sdId: undefined,
      error: error || UNEXPECTED_MESSAGE,
    };
  }

  const sdId = xml.getElementsByTagNameNS(sdNS, 'sdIdentifier').item(0)?.textContent || undefined;

  return { sdId, error };
}

/**
 * @param {Array<string>} sdIds TRACES identifiers, at most 100 (TRACES limit per call)
 * @returns {Promise<{statements?: Array<StatementInfo>, error?: string}>}
 */
export async function retrieveSd(sdIds) {
  const { status, text, xml } = await tracesRequest(`${ddsNS}/getSd`, () =>
    getRetrieveSdXML(sdIds),
  );
  if (!xml) {
    console.error('TRACES getSd: invalid response:', status, text);
    return { error: UNEXPECTED_MESSAGE };
  }
  if (xml.getElementsByTagNameNS(sdNS, 'NotFoundException').length > 0) {
    return { statements: [] };
  }
  if (status >= 400) {
    console.error('TRACES getSd error:', status, text);
    return { error: getFaultMessage(xml) || UNEXPECTED_MESSAGE };
  }
  const overviewElements = xml.getElementsByTagNameNS(sdNS, 'sdOverviewList');
  const statementInfos = [];
  for (let i = 0, ii = overviewElements.length; i < ii; i++) {
    const overview = overviewElements.item(i);
    const sdId = overview?.getElementsByTagNameNS(commonNS, 'uuid').item(0)?.textContent;
    const date = overview?.getElementsByTagNameNS(commonNS, 'date').item(0)?.textContent;
    const status = overview?.getElementsByTagNameNS(commonNS, 'status').item(0)?.textContent;
    if (!sdId || !date || !status) {
      continue;
    }
    const internalReferenceNumber =
      overview.getElementsByTagNameNS(commonNS, 'internalReferenceNumber').item(0)?.textContent ||
      undefined;
    const referenceNumber =
      overview.getElementsByTagNameNS(commonNS, 'referenceNumber').item(0)?.textContent ||
      undefined;
    const verificationNumber =
      overview.getElementsByTagNameNS(commonNS, 'verificationNumber').item(0)?.textContent ||
      undefined;
    statementInfos.push({
      sdId,
      internalReferenceNumber,
      referenceNumber,
      verificationNumber,
      status: /** @type {TracesStatus} */ (status),
      date,
    });
  }
  return { statements: statementInfos };
}

/**
 * @param {string} internalReference
 * @returns {Promise<{statements?: Array<StatementInfo>, error?: string | undefined}>}
 */
export async function retrieveSdByInternalReference(internalReference) {
  const getBody = () => `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:sd="http://ec.europa.eu/tracesnt/certificate/eudr/simplified-declaration/v3"
    xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
        ${getHeader()}
        <soapenv:Body>
            <sd:GetSdByInternalReferenceRequest>
                <sd:internalReference>${getInternalReferenceHash(internalReference)}</sd:internalReference>
            </sd:GetSdByInternalReferenceRequest>
        </soapenv:Body>
    </soapenv:Envelope>`;

  const { status, text, xml } = await tracesRequest(`${ddsNS}/getSdByInternalReference`, getBody);
  if (!xml) {
    console.error('TRACES getSdByInternalReference: invalid response:', status, text);
    return { error: UNEXPECTED_MESSAGE };
  }
  const error = getFaultMessage(xml);
  // TRACES answers a query without any matching statements with an HTTP 500 SOAP
  // fault ("Declaration not found.") carrying a NotFoundException detail. That is
  // not an error for us - the user simply has no statements yet, so report an
  // empty list instead of a server error.
  if (xml.getElementsByTagNameNS(sdNS, 'NotFoundException').length > 0) {
    return { statements: [] };
  }
  if (status >= 400) {
    console.error('TRACES getSdByInternalReference error:', status, text);
    return {
      error: error || UNEXPECTED_MESSAGE,
    };
  }

  const overviewElements = xml.getElementsByTagNameNS(sdNS, 'sdOverviewList');
  const statements = [];
  for (let i = 0; i < overviewElements.length; i++) {
    const overview = /** @type {import('@xmldom/xmldom').Element} */ (overviewElements.item(i));
    const sdId = overview.getElementsByTagNameNS(commonNS, 'uuid').item(0)?.textContent;
    if (!sdId) {
      console.error('TRACES getSdByInternalReference: no sdId in response:', text);
      return { error: UNEXPECTED_MESSAGE };
    }
    const date = overview.getElementsByTagNameNS(commonNS, 'date').item(0)?.textContent;
    if (!date) {
      console.error('TRACES getSdByInternalReference: no date in response:', text);
      return { error: UNEXPECTED_MESSAGE };
    }
    statements.push({
      sdId,
      referenceNumber:
        overview.getElementsByTagNameNS(commonNS, 'referenceNumber').item(0)?.textContent ||
        undefined,
      verificationNumber:
        overview.getElementsByTagNameNS(commonNS, 'verificationNumber').item(0)?.textContent ||
        undefined,
      status:
        /** @type {TracesStatus} */ (
          overview.getElementsByTagNameNS(commonNS, 'status').item(0)?.textContent
        ) || 'UNKNOWN',
      date,
    });
  }

  return { statements, error };
}

/**
 * @param {string} referenceNumber
 * @param {string} verificationNumber
 * @returns {Promise<{commodities?: Array<CommodityDataWithKey>, geolocationVisible?: boolean, error?: string | undefined}>}
 */
export async function retrieveSdData(referenceNumber, verificationNumber) {
  const getBody = () => `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:sd="http://ec.europa.eu/tracesnt/certificate/eudr/simplified-declaration/v3"
    xmlns:eudrCommon="http://ec.europa.eu/tracesnt/certificate/eudr/common/v3"
    xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
        ${getHeader()}
        <soapenv:Body>
            <sd:GetSdByIdentifiersRequest>
              <sd:referenceAndVerificationNumber>
                <eudrCommon:referenceNumber>${escapeXml(referenceNumber)}</eudrCommon:referenceNumber>
                <eudrCommon:verificationNumber>${escapeXml(verificationNumber)}</eudrCommon:verificationNumber>
              </sd:referenceAndVerificationNumber>
            </sd:GetSdByIdentifiersRequest>
        </soapenv:Body>
    </soapenv:Envelope>`;

  const { status, text, xml } = await tracesRequest(`${ddsNS}/getSdByIdentifiers`, getBody);
  if (!xml) {
    console.error('TRACES getSdByIdentifiers: invalid response:', status, text);
    return { error: UNEXPECTED_MESSAGE };
  }
  const error = getFaultMessage(xml);
  if (status >= 400) {
    console.error('TRACES getSdByIdentifiers error:', status, text);
    return {
      error: error || UNEXPECTED_MESSAGE,
    };
  }
  const statementElement = xml.getElementsByTagNameNS(sdNS, 'statement').item(0);
  if (!statementElement) {
    console.error('TRACES getSdByIdentifiers: no statement element in response:', text);
    return {
      error: UNEXPECTED_MESSAGE,
    };
  }

  const commoditiesElements = statementElement.getElementsByTagNameNS(sdNS, 'commodities');
  /** @type {Array<CommodityDataWithKey>} */
  const commodities = [];
  for (let i = 0; i < commoditiesElements.length; i++) {
    const commodity = /** @type {import('@xmldom/xmldom').Element} */ (commoditiesElements.item(i));
    const submittedHsCode =
      commodity.getElementsByTagNameNS(sdNS, 'hsHeading').item(0)?.textContent ?? '';
    const hsCode = /** @type {import('~~/shared/utils/constants').HSCode} */ (
      LEGACY_HS_HEADING[submittedHsCode] ?? submittedHsCode
    );
    const goodsMeasureElement = commodity.getElementsByTagNameNS(commonNS, 'goodsMeasure').item(0);
    const producerElement = commodity.getElementsByTagNameNS(sdNS, 'producers').item(0);
    const producerLocationElement = producerElement
      ?.getElementsByTagNameNS(sdNS, 'producerLocation')
      .item(0);
    const geojsonText = producerLocationElement
      ?.getElementsByTagNameNS(sdNS, 'geometryGeojson')
      .item(0)?.textContent;
    // A producer location is either a GeoJSON geometry or a postal address
    // (§4.2.3 SdProducerLocationType). Parse whichever the statement carries so
    // that confidential (address-only) declarations still show their location.
    const postalAddressElement = producerLocationElement
      ?.getElementsByTagNameNS(sdNS, 'postalAddress')
      .item(0);
    /** @type {import('~/composables/useStatement').Address} */
    const address = postalAddressElement
      ? {
          street:
            postalAddressElement.getElementsByTagNameNS(sdNS, 'producerStreet').item(0)
              ?.textContent ?? '',
          postalCode:
            postalAddressElement.getElementsByTagNameNS(sdNS, 'producerPostalCode').item(0)
              ?.textContent ?? '',
          city:
            postalAddressElement.getElementsByTagNameNS(sdNS, 'producerCity').item(0)
              ?.textContent ?? '',
        }
      : null;
    // Guard the decode: a single malformed geometry must not abort retrieval of
    // the whole statement (which would surface as "details cannot be retrieved").
    /** @type {*} */
    let geojson = null;
    if (geojsonText) {
      try {
        geojson = JSON.parse(atob(geojsonText));
      } catch (e) {
        console.error('TRACES getSdByIdentifiers: failed to parse geometryGeojson', e);
      }
    }
    const key = /** @type {import('~~/shared/utils/constants').Commodity} */ (
      Object.keys(COMMODITIES).find((key) => {
        return COMMODITIES[
          /** @type {import('~~/shared/utils/constants').Commodity} */ (key)
        ].hsHeadings.includes(hsCode);
      })
    );
    const quantity = {
      // Prefer the supplementary unit (m³ for wood, head count for cattle) when
      // present. Older statements also carry an estimated netWeight for those
      // commodities, so dividing it by 1000 would yield a wrong amount. Soja has
      // no supplementary unit and falls back to netWeight (t).
      [hsCode]:
        Number(
          goodsMeasureElement?.getElementsByTagNameNS(commonNS, 'supplementaryUnit').item(0)
            ?.textContent,
        ) ||
        Number(
          goodsMeasureElement?.getElementsByTagNameNS(commonNS, 'netWeight').item(0)?.textContent, // kg, convert to t
        ) / 1000,
    };
    const existing = commodities.find((c) => c.key === key);
    if (existing) {
      const existingQuantity = unref(existing.quantity);
      // Legacy cattle statements carry two headings that now map to one; add them up.
      existing.quantity = {
        ...existingQuantity,
        [hsCode]: (existingQuantity[hsCode] || 0) + (quantity[hsCode] || 0),
      };
      existing.geojson = unref(existing.geojson) ?? geojson;
      existing.address = unref(existing.address) ?? address;
    } else {
      commodities.push({
        key,
        quantity,
        geojson,
        address,
      });
    }
  }

  const geoLocationConfidential = statementElement
    .getElementsByTagNameNS(sdNS, 'geoLocationConfidential')
    .item(0)?.textContent;
  const geolocationVisible = geoLocationConfidential !== 'true';

  // A commodity legitimately has no geojson when a postal address was submitted
  // instead of a drawn geolocation; only missing both is an actual inconsistency.
  if (geolocationVisible && commodities.some((c) => !c.geojson && !c.address)) {
    console.error(
      'TRACES getSdByIdentifiers: geoLocationConfidential=false but no geometryGeojson or address found.' +
        ' producers count per commodity:',
      Array.from(
        { length: statementElement.getElementsByTagNameNS(sdNS, 'commodities').length },
        (_, i) => {
          const c = statementElement.getElementsByTagNameNS(sdNS, 'commodities').item(i);
          return c?.getElementsByTagNameNS(sdNS, 'producers').length ?? 0;
        },
      ),
    );
  }

  return { commodities, geolocationVisible, error };
}
