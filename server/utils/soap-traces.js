import { randomBytes, createHash } from 'crypto';
import { DOMParser } from '@xmldom/xmldom';
import { Agent } from 'undici';
import { unref } from 'vue';
import { COMMODITIES, HS_HEADING } from '~~/shared/utils/constants.js';

/** @typedef {'AVAILABLE' | 'SUBMITTED' | 'REJECTED' | 'CANCELLED' | 'WITHDRAWN' | 'ARCHIVED'} TracesStatus */

/**
 * @typedef {Object} StatementInfo
 * @property {string} ddsId
 * @property {string} [referenceNumber]
 * @property {string} [verificationNumber]
 * @property {TracesStatus} status
 * @property {Date} date
 * @property {Array<CommodityDataWithKey>} [commodities]
 * @property {string} [commoditiesSummary] Short summary of commodities (for display in list)
 */

/**
 * @typedef {Object} StatementPayload
 * @property {Array<CommodityDataWithKey>} commodities
 * @property {boolean} geolocationVisible
 */

/** @typedef {StatementInfo & StatementPayload} StatementData */

/** @typedef {Array<[string, string]>} SpeciesList */

/**
 * @typedef {Object} CommodityData
 * @property {import('~/composables/useStatement').Quantity|import('vue').Ref<import('~/composables/useStatement').Quantity>} quantity
 * @property {import('geojson').FeatureCollection|import('vue').Ref<import('geojson').FeatureCollection>} geojson
 * @property {SpeciesList|import('vue').Ref<SpeciesList|null>} [speciesList]
 */

/**
 * @typedef {{key: import('~~/shared/utils/constants.js').Commodity} & CommodityData} CommodityDataWithKey
 */
const errorNS = 'http://ec.europa.eu/sanco/tracesnt/error/v01';
const submissionNS = 'http://ec.europa.eu/tracesnt/certificate/eudr/submission/v1';
const retrievalNS = 'http://ec.europa.eu/tracesnt/certificate/eudr/retrieval/v1';
const commodityNS = 'http://ec.europa.eu/tracesnt/certificate/eudr/model/v1';

/** Generate Nonce
 * @returns {string}
 */
function generateNonce() {
  return randomBytes(16).toString('base64');
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
      <v4:WebServiceClientId>eudr-test</v4:WebServiceClientId>
    </soapenv:Header>`;
}

/**
 * @param {Array<CommodityDataWithKey>} commodities
 */
function getCommoditiesXML(commodities) {
  const commodityXMLs = [];
  for (const commodity of commodities) {
    const geojson = unref(commodity.geojson);
    if (geojson && geojson.features.length === 0) {
      continue;
    }
    const key = commodity.key;
    const hsCodes = /** @type {Array<import('~~/shared/utils/constants').HSCode>} */ (
      Object.keys(commodity.quantity)
    );
    if (geojson && geojson.features.length === 0) {
      continue;
    }
    const speciesList = unref(commodity.speciesList);
    for (const hsCode of hsCodes) {
      const quantity = /** @type {number} */ (unref(commodity.quantity)[hsCode]);
      if (!quantity) {
        continue;
      }
      const geoJSONBase64 = btoa(JSON.stringify(commodity.geojson));

      const quantityUnits =
        COMMODITIES[/** @type {import('~~/shared/utils/constants.js').Commodity} */ (key)].units;

      const speciesInfo = speciesList
        ? speciesList
            .map(
              ([scientificName, commonName]) => `
                <v11:speciesInfo>
                  <v11:scientificName>${scientificName}</v11:scientificName>
                  <v11:commonName>${commonName}</v11:commonName>
                </v11:speciesInfo>`,
            )
            .join('\n')
        : '';
      /** @type {string} */
      let quantityInfo;
      switch (quantityUnits) {
        case 'm³':
          quantityInfo = `
          <v11:supplementaryUnit>${quantity}</v11:supplementaryUnit>
          <v11:supplementaryUnitQualifier>MTQ</v11:supplementaryUnitQualifier>
        `;
          break;
        case 't':
          quantityInfo = `<v11:netWeight>${quantity * 1000}</v11:netWeight>`; // kg, converted from t
          break;
        case 'Stk.': // NAR - number of articles
          quantityInfo = `
          <v11:supplementaryUnit>${quantity}</v11:supplementaryUnit>
          <v11:supplementaryUnitQualifier>NAR</v11:supplementaryUnitQualifier>
        `;
          break;
        default:
          throw new Error('Invalid quantity units');
      }

      const descriptor = `
        <v11:descriptors>
          <v11:descriptionOfGoods>${HS_HEADING[hsCode]}</v11:descriptionOfGoods>
          <v11:goodsMeasure>
            ${quantityInfo}
          </v11:goodsMeasure>
        </v11:descriptors>`;
      const hsHeading = `<v11:hsHeading>${hsCode}</v11:hsHeading>`;

      commodityXMLs.push(`
        <v11:commodities>
          ${descriptor}
          ${hsHeading}
          ${speciesInfo}
          <v11:producers>
            <v11:country>AT</v11:country>
            <v11:geometryGeojson>${geoJSONBase64}</v11:geometryGeojson>
          </v11:producers>
        </v11:commodities>`);
    }
  }
  return commodityXMLs.join('\n');
}

/**
 * @param {Array<CommodityDataWithKey>} commodities
 * @param {boolean} geolocationVisible
 * @param {import('~~/server/db/schema/users').User} user
 * @returns {string}
 */
function getSubmitXML(commodities, geolocationVisible, user) {
  const commoditiesXML = getCommoditiesXML(commodities);

  return `<?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:v1="http://ec.europa.eu/tracesnt/certificate/eudr/submission/v1"
      xmlns:v11="http://ec.europa.eu/tracesnt/certificate/eudr/model/v1"
      xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
      ${getHeader()}
      <soapenv:Body>
        <v1:SubmitStatementRequest>
          <v1:operatorType>REPRESENTATIVE_OPERATOR</v1:operatorType>
          <v1:statement>
            <v11:internalReferenceNumber>${user.id}</v11:internalReferenceNumber>
            <v11:activityType>DOMESTIC</v11:activityType>
            <v11:operator>
              <v11:referenceNumber>
                <v11:identifierType>${user.identifierType?.toLowerCase()}</v11:identifierType>
                <v11:identifierValue>${user.identifierValue}</v11:identifierValue>
              </v11:referenceNumber>
              <v11:nameAndAddress>
                <v4:name>${user.name}</v4:name>
                <v4:country>AT</v4:country>
                <v4:address>${user.address}</v4:address>
              </v11:nameAndAddress>
            </v11:operator>
            <v11:countryOfActivity>AT</v11:countryOfActivity>
            ${commoditiesXML}
            <v11:geoLocationConfidential>${!geolocationVisible}</v11:geoLocationConfidential>
          </v1:statement>
        </v1:SubmitStatementRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;
}

/**
 * @param {Array<string>} identifiers TRACES identifiers
 * @returns {string}
 */
function getRetrieveXML(identifiers) {
  const identifiersXML = identifiers
    .map((identifier) => `<v1:identifier>${identifier}</v1:identifier>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:v1="http://ec.europa.eu/tracesnt/certificate/eudr/retrieval/v1"
      xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
      ${getHeader()}
      <soapenv:Body>
        <v1:GetStatementInfoRequest>
          ${identifiersXML}
        </v1:GetStatementInfoRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;
}

/**
 * @param {Array<CommodityDataWithKey>} commodities
 * @param {boolean} geolocationVisible
 * @param {import('~~/server/db/schema/users').User} user
 * @returns {Promise<{ ddsId: string | undefined, error: string | undefined }>}
 */
export async function submitDDS(commodities, geolocationVisible, user) {
  if (!user) {
    throw new Error('User is required for DDS submission');
  }
  const body = getSubmitXML(commodities, geolocationVisible, user);
  const submitResponse = await fetch(
    'https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRSubmissionServiceV1',
    {
      // Work around self-signed certificate on acceptance server
      //@ts-ignore
      dispatcher: new Agent({
        connect: {
          rejectUnauthorized: process.env.FETCH_TRACES_REJECT_UNAUTHORIZED !== 'false',
        },
      }),
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://ec.europa.eu/tracesnt/certificate/eudr/submission/submitDds',
      },
    },
  );
  const submitResponseXML = await submitResponse.text();
  const xml = new DOMParser().parseFromString(submitResponseXML, 'text/xml');
  const faultString = xml.getElementsByTagName('faultstring').item(0)?.textContent;
  const message = xml.getElementsByTagNameNS(errorNS, 'Message').item(0)?.textContent;
  const error = `${faultString ? faultString + ': ' : ''}${message || ''}`.trim();
  if (submitResponse.status >= 500) {
    return {
      ddsId: undefined,
      error: error || 'TRACES database currently unavailable, try again later',
    };
  }

  const ddsId =
    xml.getElementsByTagNameNS(submissionNS, 'ddsIdentifier').item(0)?.textContent || undefined;

  return { ddsId, error };
}

/**
 * @param {Array<string>} ddsIds TRACES identifiers
 * @returns {Promise<Array<StatementInfo> | null>} DDS info or null in case of an error
 */
export async function retrieveDDS(ddsIds) {
  const retrieveXML = getRetrieveXML(ddsIds);
  const retrieveResponse = await fetch(
    'https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRRetrievalServiceV1',
    {
      // Work around self-signed certificate on acceptance server
      //@ts-ignore
      dispatcher: new Agent({
        connect: {
          rejectUnauthorized: process.env.FETCH_TRACES_REJECT_UNAUTHORIZED !== 'false',
        },
      }),
      method: 'POST',
      body: retrieveXML,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://ec.europa.eu/tracesnt/certificate/eudr/retrieval/getDdsInfo',
      },
    },
  );
  const retrieveResponseXML = await retrieveResponse.text();
  const xml = new DOMParser().parseFromString(retrieveResponseXML, 'text/xml');
  const statementInfoElements = xml.getElementsByTagNameNS(retrievalNS, 'statementInfo');
  if (!statementInfoElements) {
    return null;
  }
  const statementInfos = [];
  for (let i = 0, ii = statementInfoElements.length; i < ii; i++) {
    const statementInfo = statementInfoElements.item(i);
    const ddsId = statementInfo
      ?.getElementsByTagNameNS(retrievalNS, 'identifier')
      .item(0)?.textContent;
    const date = statementInfo?.getElementsByTagNameNS(retrievalNS, 'date').item(0)?.textContent;
    const status = statementInfo
      ?.getElementsByTagNameNS(retrievalNS, 'status')
      .item(0)?.textContent;
    if (!ddsId || !date || !status) {
      continue;
    }
    const referenceNumber =
      statementInfo.getElementsByTagNameNS(retrievalNS, 'referenceNumber').item(0)?.textContent ||
      undefined;
    const verificationNumber =
      statementInfo.getElementsByTagNameNS(retrievalNS, 'verificationNumber').item(0)
        ?.textContent || undefined;
    statementInfos.push({
      ddsId,
      referenceNumber,
      verificationNumber,
      status: /** @type {TracesStatus} */ (status),
      date: new Date(date),
    });
  }
  return statementInfos;
}

/**
 * @param {string} internalReference
 * @returns {Promise<{statements?: Array<StatementInfo>, error?: string | undefined}>}
 */
export async function retrieveDDSByInternalReference(internalReference) {
  const body = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:v1="http://ec.europa.eu/tracesnt/certificate/eudr/retrieval/v1"
    xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
        ${getHeader()}
        <soapenv:Body>
            <v1:GetDdsInfoByInternalReferenceNumberRequest>${internalReference}</v1:GetDdsInfoByInternalReferenceNumberRequest>
        </soapenv:Body>
    </soapenv:Envelope>`;

  try {
    const submitResponse = await fetch(
      'https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRRetrievalServiceV1',
      {
        // Work around self-signed certificate on acceptance server
        //@ts-ignore
        dispatcher: new Agent({
          connect: {
            rejectUnauthorized: process.env.FETCH_TRACES_REJECT_UNAUTHORIZED !== 'false',
          },
        }),
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction':
            'http://ec.europa.eu/tracesnt/certificate/eudr/retrieval/getDdsInfoByInternalReferenceNumber',
        },
      },
    );
    const submitResponseXML = await submitResponse.text();
    const xml = new DOMParser().parseFromString(submitResponseXML, 'text/xml');
    const faultString = xml.getElementsByTagName('faultstring').item(0)?.textContent;
    const message = xml.getElementsByTagNameNS(errorNS, 'Message').item(0)?.textContent;
    const error = `${faultString ? faultString + ': ' : ''}${message || ''}`.trim();
    if (submitResponse.status >= 500) {
      return {
        error: error || 'TRACES database currently unavailable, try again later',
      };
    }

    const statementElements = xml.getElementsByTagNameNS(retrievalNS, 'statementInfo');
    const statements = [];
    for (let i = 0; i < statementElements.length; i++) {
      const statement = /** @type {import('@xmldom/xmldom').Element} */ (statementElements.item(i));
      const ddsId = statement
        .getElementsByTagNameNS(retrievalNS, 'identifier')
        .item(0)?.textContent;
      if (!ddsId) {
        return { error: 'Invalid response from TRACES: no ddsId' };
      }
      const date = statement.getElementsByTagNameNS(retrievalNS, 'date').item(0)?.textContent;
      if (!date) {
        return { error: 'Invalid response from TRACES: no date' };
      }
      statements.push({
        ddsId,
        referenceNumber:
          statement.getElementsByTagNameNS(retrievalNS, 'referenceNumber').item(0)?.textContent ||
          undefined,
        verificationNumber:
          statement.getElementsByTagNameNS(retrievalNS, 'verificationNumber').item(0)
            ?.textContent || undefined,
        status:
          /** @type {TracesStatus} */ (
            statement.getElementsByTagNameNS(retrievalNS, 'status').item(0)?.textContent
          ) || 'UNKNOWN',
        date: new Date(date),
      });
    }

    return { statements, error };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error',
    };
  }
}

/**
 * @param {string} referenceNumber
 * @param {string} verificationNumber
 * @returns {Promise<{commodities?: Array<CommodityDataWithKey>, error?: string | undefined}>}
 */
export async function retrieveDDSData(referenceNumber, verificationNumber) {
  const body = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:v1="http://ec.europa.eu/tracesnt/certificate/eudr/retrieval/v1"
    xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
        ${getHeader()}
        <soapenv:Body>
            <v1:GetStatementByIdentifiersRequest>
              <v1:referenceNumber>${referenceNumber}</v1:referenceNumber>
              <v1:verificationNumber>${verificationNumber}</v1:verificationNumber>
            </v1:GetStatementByIdentifiersRequest>
        </soapenv:Body>
    </soapenv:Envelope>`;

  const submitResponse = await fetch(
    'https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRRetrievalServiceV1',
    {
      // Work around self-signed certificate on acceptance server
      //@ts-ignore
      dispatcher: new Agent({
        connect: {
          rejectUnauthorized: process.env.FETCH_TRACES_REJECT_UNAUTHORIZED !== 'false',
        },
      }),
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://ec.europa.eu/tracesnt/certificate/eudr/retrieval/getDdsInfo',
      },
    },
  );
  const submitResponseXML = await submitResponse.text();
  const xml = new DOMParser().parseFromString(submitResponseXML, 'text/xml');
  const faultString = xml.getElementsByTagName('faultstring').item(0)?.textContent;
  const message = xml.getElementsByTagNameNS(errorNS, 'Message').item(0)?.textContent;
  const error = `${faultString ? faultString + ': ' : ''}${message || ''}`.trim();
  if (submitResponse.status >= 500) {
    return {
      error: error || 'TRACES database currently unavailable, try again later',
    };
  }
  const statementElement = xml.getElementsByTagNameNS(retrievalNS, 'statement').item(0);
  if (!statementElement) {
    return {
      error: 'No statement found',
    };
  }

  const commoditiesElements = statementElement.getElementsByTagNameNS(retrievalNS, 'commodities');
  /** @type {Array<CommodityDataWithKey>} */
  const commodities = [];
  for (let i = 0; i < commoditiesElements.length; i++) {
    const commodity = /** @type {import('@xmldom/xmldom').Element} */ (commoditiesElements.item(i));
    const hsCode = /** @type {import('~~/shared/utils/constants').HSCode} */ (
      commodity.getElementsByTagNameNS(commodityNS, 'hsHeading').item(0)?.textContent
    );
    const goodsMeasureElement = commodity
      .getElementsByTagNameNS(commodityNS, 'goodsMeasure')
      .item(0);
    const geojsonText = commodity
      .getElementsByTagNameNS(commodityNS, 'geometryGeojson')
      .item(0)?.textContent;
    const key = /** @type {import('~~/shared/utils/constants').Commodity} */ (
      Object.keys(COMMODITIES).find((key) => {
        return COMMODITIES[
          /** @type {import('~~/shared/utils/constants').Commodity} */ (key)
        ].hsHeadings.includes(hsCode);
      })
    );
    const quantity = {
      [hsCode]:
        Number(
          goodsMeasureElement?.getElementsByTagNameNS(commodityNS, 'netWeight').item(0)
            ?.textContent, // kg, convert to t
        ) / 1000 ||
        Number(
          goodsMeasureElement?.getElementsByTagNameNS(commodityNS, 'supplementaryUnit').item(0)
            ?.textContent,
        ),
    };
    const existing = commodities.find((c) => c.key === key);
    if (existing) {
      existing.quantity = { ...existing.quantity, ...quantity };
    } else {
      commodities.push({
        key,
        quantity,
        geojson: geojsonText ? JSON.parse(atob(geojsonText)) : null,
      });
    }
  }

  return { commodities, error };
}
