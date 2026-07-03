import { randomBytes, createHash } from 'crypto';
import { DOMParser } from '@xmldom/xmldom';
import { Agent } from 'undici';
import { unref } from 'vue';
import { COMMODITIES, HS_HEADING } from '~~/shared/utils/constants.js';

/** @typedef {'AVAILABLE' | 'SUBMITTED' | 'REJECTED' | 'CANCELLED' | 'WITHDRAWN' | 'ARCHIVED'} TracesStatus */

/** @typedef {{id: string, name: string, address: string, identifierType: import('~/utils/utils').IdentifierType, identifierValue: string}} User */

/**
 * @typedef {Object} StatementInfo
 * @property {string} ddsId
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

/** @typedef {Array<[string, string]>} SpeciesList */

/**
 * @typedef {Object} CommodityData
 * @property {import('~/composables/useStatement').Quantity|import('vue').Ref<import('~/composables/useStatement').Quantity>} quantity
 * @property {import('geojson').FeatureCollection<import('geojson').Geometry | null>|import('vue').Ref<import('geojson').FeatureCollection<import('geojson').Geometry | null>>} geojson
 * @property {SpeciesList|import('vue').Ref<SpeciesList|null>} [speciesList]
 */

/**
 * @typedef {{key: import('~~/shared/utils/constants.js').Commodity} & CommodityData} CommodityDataWithKey
 */
const errorNS = 'http://ec.europa.eu/sanco/tracesnt/error/v01';
const ddsNS = 'http://ec.europa.eu/tracesnt/certificate/eudr/due-diligence-statement/v3';
const commonNS = 'http://ec.europa.eu/tracesnt/certificate/eudr/common/v3';
const tracesV3Endpoint =
  'https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRDueDiligenceStatementServiceV3';

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
                <dds:speciesInfo>
                  <dds:scientificName>${scientificName}</dds:scientificName>
                  <dds:commonName>${commonName}</dds:commonName>
                </dds:speciesInfo>`,
            )
            .join('\n')
        : '';
      /** @type {string} */
      let quantityInfo;
      switch (quantityUnits) {
        case 'm³':
          // V3 requires netWeight; estimate from volume using average wood density 600 kg/m³
          quantityInfo = `
          <eudrCommon:netWeight>${Math.round(quantity * 600)}</eudrCommon:netWeight>
          <eudrCommon:supplementaryUnit>${quantity}</eudrCommon:supplementaryUnit>
          <eudrCommon:supplementaryUnitQualifier>MTQ</eudrCommon:supplementaryUnitQualifier>
        `;
          break;
        case 't':
          quantityInfo = `<eudrCommon:netWeight>${quantity * 1000}</eudrCommon:netWeight>`; // kg, converted from t
          break;
        case 'Stk.': // NAR - number of articles
          // V3 requires netWeight; estimate from head count using average cattle weight 500 kg/head
          quantityInfo = `
          <eudrCommon:netWeight>${Math.round(quantity * 500)}</eudrCommon:netWeight>
          <eudrCommon:supplementaryUnit>${quantity}</eudrCommon:supplementaryUnit>
          <eudrCommon:supplementaryUnitQualifier>NAR</eudrCommon:supplementaryUnitQualifier>
        `;
          break;
        default:
          throw new Error('Invalid quantity units');
      }

      const descriptor = `
        <dds:descriptors>
          <eudrCommon:descriptionOfGoods>${HS_HEADING[hsCode]}</eudrCommon:descriptionOfGoods>
          <eudrCommon:goodsMeasure>
            <eudrCommon:percentageEstimationOrDeviation>0</eudrCommon:percentageEstimationOrDeviation>
            ${quantityInfo}
          </eudrCommon:goodsMeasure>
        </dds:descriptors>`;
      const hsHeading = `<dds:hsHeading>${hsCode}</dds:hsHeading>`;

      commodityXMLs.push(`
        <dds:commodities>
          ${descriptor}
          ${hsHeading}
          ${speciesInfo}
          <dds:producers>
            <dds:country>AT</dds:country>
            <dds:geometryGeojson>${geoJSONBase64}</dds:geometryGeojson>
          </dds:producers>
        </dds:commodities>`);
    }
  }
  return commodityXMLs.join('\n');
}

/**
 * Parse a combined address string ("Street HouseNo, PostalCode City") into structured components.
 * @param {string} address
 * @returns {{ street: string, postalCode: string, city: string } | null}
 */
function parseAddress(address) {
  const commaIdx = address.lastIndexOf(', ');
  if (commaIdx === -1) return null;
  const street = address.substring(0, commaIdx).trim();
  const cityPart = address.substring(commaIdx + 2).trim();
  const spaceIdx = cityPart.indexOf(' ');
  if (spaceIdx === -1) return null;
  const postalCode = cityPart.substring(0, spaceIdx).trim();
  const city = cityPart.substring(spaceIdx + 1).trim();
  if (!street || !postalCode || !city) return null;
  return { street, postalCode, city };
}

/**
 * @param {Array<CommodityDataWithKey>} commodities
 * @param {boolean} geolocationVisible
 * @param {User} user
 * @returns {string}
 */
function getSubmitXML(commodities, geolocationVisible, user) {
  const commoditiesXML = getCommoditiesXML(commodities);
  const parsedAddress = parseAddress(user.address);
  const operatorAddress = parsedAddress
    ? `<eudrCommon:operatorAddress>
                <eudrCommon:country>AT</eudrCommon:country>
                <eudrCommon:street>${parsedAddress.street}</eudrCommon:street>
                <eudrCommon:postalCode>${parsedAddress.postalCode}</eudrCommon:postalCode>
                <eudrCommon:city>${parsedAddress.city}</eudrCommon:city>
              </eudrCommon:operatorAddress>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:dds="http://ec.europa.eu/tracesnt/certificate/eudr/due-diligence-statement/v3"
      xmlns:eudrCommon="http://ec.europa.eu/tracesnt/certificate/eudr/common/v3"
      xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
      ${getHeader()}
      <soapenv:Body>
        <dds:SubmitDdsRequest>
          <dds:operatorRole>REPRESENTATIVE_OPERATOR</dds:operatorRole>
          <dds:statement>
            <dds:internalReferenceNumber>${user.id}</dds:internalReferenceNumber>
            <dds:activityType>DOMESTIC</dds:activityType>
            <dds:representedOperator>
              <eudrCommon:operatorReferenceNumber>
                <eudrCommon:identifierType>${user.identifierType?.toLowerCase()}</eudrCommon:identifierType>
                <eudrCommon:identifierValue>${user.identifierValue}</eudrCommon:identifierValue>
              </eudrCommon:operatorReferenceNumber>
              ${operatorAddress}
              <eudrCommon:operatorName>${user.name}</eudrCommon:operatorName>
            </dds:representedOperator>
            <dds:countryOfActivity>AT</dds:countryOfActivity>
            ${commoditiesXML}
            <dds:geoLocationConfidential>${!geolocationVisible}</dds:geoLocationConfidential>
          </dds:statement>
        </dds:SubmitDdsRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;
}

/**
 * @param {Array<string>} ddsIds TRACES UUIDs
 * @returns {string}
 */
function getRetrieveXML(ddsIds) {
  const uuidListXML = ddsIds.map((id) => `<dds:uuidList>${id}</dds:uuidList>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:dds="http://ec.europa.eu/tracesnt/certificate/eudr/due-diligence-statement/v3"
      xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
      ${getHeader()}
      <soapenv:Body>
        <dds:GetDdsRequest>
          ${uuidListXML}
        </dds:GetDdsRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;
}

/**
 * @param {Array<CommodityDataWithKey>} commodities
 * @param {boolean} geolocationVisible
 * @param {User} user
 * @returns {Promise<{ ddsId: string | undefined, error: string | undefined }>}
 */
export async function submitDDS(commodities, geolocationVisible, user) {
  if (!user) {
    throw new Error('User is required for DDS submission');
  }
  const body = getSubmitXML(commodities, geolocationVisible, user);
  const submitResponse = await fetch(tracesV3Endpoint, {
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
        'http://ec.europa.eu/tracesnt/certificate/eudr/due-diligence-statement/submitDds',
    },
  });
  const submitResponseXML = await submitResponse.text();
  const xml = new DOMParser().parseFromString(submitResponseXML, 'text/xml');
  const faultString = xml.getElementsByTagName('faultstring').item(0)?.textContent;
  const message = xml.getElementsByTagNameNS(errorNS, 'Message').item(0)?.textContent;
  const error = `${faultString ? faultString + ': ' : ''}${message || ''}`.trim();
  if (submitResponse.status >= 500) {
    console.error('TRACES submit error:', submitResponseXML, 'body:', body);
    return {
      ddsId: undefined,
      error: error || 'TRACES database currently unavailable, try again later',
    };
  }

  const ddsId = xml.getElementsByTagNameNS(ddsNS, 'uuid').item(0)?.textContent || undefined;

  return { ddsId, error };
}

/**
 * @param {Array<string>} ddsIds TRACES identifiers
 * @returns {Promise<Array<StatementInfo> | null>} DDS info or null in case of an error
 */
export async function retrieveDDS(ddsIds) {
  const retrieveXML = getRetrieveXML(ddsIds);
  const retrieveResponse = await fetch(tracesV3Endpoint, {
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
      'SOAPAction': 'http://ec.europa.eu/tracesnt/certificate/eudr/due-diligence-statement/getDds',
    },
  });
  const retrieveResponseXML = await retrieveResponse.text();
  const xml = new DOMParser().parseFromString(retrieveResponseXML, 'text/xml');
  const overviewElements = xml.getElementsByTagNameNS(ddsNS, 'ddsOverviewList');
  if (!overviewElements) {
    return null;
  }
  const statementInfos = [];
  for (let i = 0, ii = overviewElements.length; i < ii; i++) {
    const overview = overviewElements.item(i);
    const ddsId = overview?.getElementsByTagNameNS(commonNS, 'uuid').item(0)?.textContent;
    const date = overview?.getElementsByTagNameNS(commonNS, 'date').item(0)?.textContent;
    const status = overview?.getElementsByTagNameNS(commonNS, 'status').item(0)?.textContent;
    if (!ddsId || !date || !status) {
      continue;
    }
    const referenceNumber =
      overview.getElementsByTagNameNS(commonNS, 'referenceNumber').item(0)?.textContent ||
      undefined;
    const verificationNumber =
      overview.getElementsByTagNameNS(commonNS, 'verificationNumber').item(0)?.textContent ||
      undefined;
    statementInfos.push({
      ddsId,
      referenceNumber,
      verificationNumber,
      status: /** @type {TracesStatus} */ (status),
      date,
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
    xmlns:dds="http://ec.europa.eu/tracesnt/certificate/eudr/due-diligence-statement/v3"
    xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
        ${getHeader()}
        <soapenv:Body>
            <dds:GetDdsByInternalReferenceRequest>
                <dds:internalReference>${internalReference}</dds:internalReference>
            </dds:GetDdsByInternalReferenceRequest>
        </soapenv:Body>
    </soapenv:Envelope>`;

  try {
    const submitResponse = await fetch(tracesV3Endpoint, {
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
          'http://ec.europa.eu/tracesnt/certificate/eudr/due-diligence-statement/getDdsByInternalReference',
      },
    });
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

    const overviewElements = xml.getElementsByTagNameNS(ddsNS, 'ddsOverviewList');
    const statements = [];
    for (let i = 0; i < overviewElements.length; i++) {
      const overview = /** @type {import('@xmldom/xmldom').Element} */ (overviewElements.item(i));
      const ddsId = overview.getElementsByTagNameNS(commonNS, 'uuid').item(0)?.textContent;
      if (!ddsId) {
        return { error: 'Invalid response from TRACES: no ddsId' };
      }
      const date = overview.getElementsByTagNameNS(commonNS, 'date').item(0)?.textContent;
      if (!date) {
        return { error: 'Invalid response from TRACES: no date' };
      }
      statements.push({
        ddsId,
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
  } catch (error) {
    return {
      error: error instanceof Error ? error.message || 'Unknown error' : 'Unknown error',
    };
  }
}

/**
 * @param {string} referenceNumber
 * @param {string} verificationNumber
 * @returns {Promise<{commodities?: Array<CommodityDataWithKey>, geolocationVisible?: boolean, error?: string | undefined}>}
 */
export async function retrieveDDSData(referenceNumber, verificationNumber) {
  const body = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:dds="http://ec.europa.eu/tracesnt/certificate/eudr/due-diligence-statement/v3"
    xmlns:eudrCommon="http://ec.europa.eu/tracesnt/certificate/eudr/common/v3"
    xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
        ${getHeader()}
        <soapenv:Body>
            <dds:GetDdsByIdentifiersRequest>
              <dds:referenceAndVerificationNumber>
                <eudrCommon:referenceNumber>${referenceNumber}</eudrCommon:referenceNumber>
                <eudrCommon:verificationNumber>${verificationNumber}</eudrCommon:verificationNumber>
              </dds:referenceAndVerificationNumber>
            </dds:GetDdsByIdentifiersRequest>
        </soapenv:Body>
    </soapenv:Envelope>`;

  const submitResponse = await fetch(tracesV3Endpoint, {
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
        'http://ec.europa.eu/tracesnt/certificate/eudr/due-diligence-statement/getDdsByIdentifiers',
    },
  });
  const submitResponseXML = await submitResponse.text();
  const xml = new DOMParser().parseFromString(submitResponseXML, 'text/xml');
  const faultString = xml.getElementsByTagName('faultstring').item(0)?.textContent;
  const message = xml.getElementsByTagNameNS(errorNS, 'Message').item(0)?.textContent;
  const error = `${faultString ? faultString + ': ' : ''}${message || ''}`.trim();
  if (submitResponse.status >= 400) {
    console.error('TRACES getDdsByIdentifiers error:', submitResponse.status, submitResponseXML);
    return {
      error: error || 'TRACES database currently unavailable, try again later',
    };
  }
  const statementElement = xml.getElementsByTagNameNS(ddsNS, 'statement').item(0);
  if (!statementElement) {
    console.error(
      'TRACES getDdsByIdentifiers: no statement element in response:',
      submitResponseXML,
    );
    return {
      error: 'No statement found',
    };
  }

  const commoditiesElements = statementElement.getElementsByTagNameNS(ddsNS, 'commodities');
  /** @type {Array<CommodityDataWithKey>} */
  const commodities = [];
  for (let i = 0; i < commoditiesElements.length; i++) {
    const commodity = /** @type {import('@xmldom/xmldom').Element} */ (commoditiesElements.item(i));
    const hsCode = /** @type {import('~~/shared/utils/constants').HSCode} */ (
      commodity.getElementsByTagNameNS(ddsNS, 'hsHeading').item(0)?.textContent
    );
    const goodsMeasureElement = commodity.getElementsByTagNameNS(commonNS, 'goodsMeasure').item(0);
    const geojsonText = commodity
      .getElementsByTagNameNS(ddsNS, 'geometryGeojson')
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
          goodsMeasureElement?.getElementsByTagNameNS(commonNS, 'netWeight').item(0)?.textContent, // kg, convert to t
        ) / 1000 ||
        Number(
          goodsMeasureElement?.getElementsByTagNameNS(commonNS, 'supplementaryUnit').item(0)
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

  const geoLocationConfidential = statementElement
    .getElementsByTagNameNS(ddsNS, 'geoLocationConfidential')
    .item(0)?.textContent;
  const geolocationVisible = geoLocationConfidential !== 'true';

  if (geolocationVisible && commodities.some((c) => !c.geojson)) {
    console.error(
      'TRACES getDdsByIdentifiers: geoLocationConfidential=false but no geometryGeojson found.' +
        ' producers count per commodity:',
      Array.from(
        { length: statementElement.getElementsByTagNameNS(ddsNS, 'commodities').length },
        (_, i) => {
          const c = statementElement.getElementsByTagNameNS(ddsNS, 'commodities').item(i);
          return c?.getElementsByTagNameNS(ddsNS, 'producers').length ?? 0;
        },
      ),
    );
  }

  return { commodities, geolocationVisible, error };
}
