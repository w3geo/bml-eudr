import { randomBytes, createHash } from 'crypto';
import { DOMParser } from '@xmldom/xmldom';
import { Agent } from 'undici';
import { unref } from 'vue';
import { COMMODITIES, HS_HEADING } from '~~/shared/utils/constants.js';
import { parseAddress } from '~~/shared/utils/utils.js';

/** @typedef {'AVAILABLE' | 'SUBMITTED' | 'REJECTED' | 'WITHDRAWN' | 'ARCHIVED' | 'GROUPED' | 'OBSOLETE'} TracesStatus */

/** @typedef {{id: string, name: string, address: string, identifierType: import('~/utils/utils').IdentifierType, identifierValue: string}} User */

/**
 * @typedef {Object} StatementInfo
 * @property {string} sdId
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
 * @property {boolean|import('vue').Ref<boolean>} [geolocation] Whether the drawn geolocation ("Geolokalisation") is submitted as the producer location instead of the postal address ("Postadresse").
 */

/**
 * @typedef {{key: import('~~/shared/utils/constants.js').Commodity} & CommodityData} CommodityDataWithKey
 */
const errorNS = 'http://ec.europa.eu/sanco/tracesnt/error/v01';
const sdNS = 'http://ec.europa.eu/tracesnt/certificate/eudr/simplified-declaration/v3';
const commonNS = 'http://ec.europa.eu/tracesnt/certificate/eudr/common/v3';
const tracesV3Endpoint =
  'https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRSimplifiedDeclarationServiceV3';

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
                ${producerAddress.street ? `<sd:producerStreet>${producerAddress.street}</sd:producerStreet>` : ''}
                <sd:producerPostalCode>${producerAddress.postalCode}</sd:producerPostalCode>
                <sd:producerCity>${producerAddress.city}</sd:producerCity>
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
                <eudrCommon:street>${parsedAddress.street}</eudrCommon:street>
                <eudrCommon:postalCode>${parsedAddress.postalCode}</eudrCommon:postalCode>
                <eudrCommon:city>${parsedAddress.city}</eudrCommon:city>
              </eudrCommon:operatorAddress>`
    : '';
  const representedOperatorXML = `<sd:representedOperator>
              <eudrCommon:operatorReferenceNumber>
                <eudrCommon:identifierType>${user.identifierType?.toLowerCase()}</eudrCommon:identifierType>
                <eudrCommon:identifierValue>${user.identifierValue}</eudrCommon:identifierValue>
              </eudrCommon:operatorReferenceNumber>
              ${operatorAddress}
              <eudrCommon:operatorName>${user.name}</eudrCommon:operatorName>
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
            <sd:internalReferenceNumber>${user.id}</sd:internalReferenceNumber>
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
        `<sd:uuidAndVersionNumberList><eudrCommon:uuid>${id}</eudrCommon:uuid></sd:uuidAndVersionNumberList>`,
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
      'SOAPAction': 'http://ec.europa.eu/tracesnt/certificate/eudr/simplified-declaration/submitSd',
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
      sdId: undefined,
      error: error || 'TRACES database currently unavailable, try again later',
    };
  }

  const sdId = xml.getElementsByTagNameNS(sdNS, 'sdIdentifier').item(0)?.textContent || undefined;

  return { sdId, error };
}

/**
 * @param {Array<string>} sdIds TRACES identifiers
 * @returns {Promise<Array<StatementInfo> | null>} SD info or null in case of an error
 */
export async function retrieveSd(sdIds) {
  const retrieveXML = getRetrieveSdXML(sdIds);
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
      'SOAPAction': 'http://ec.europa.eu/tracesnt/certificate/eudr/simplified-declaration/getSd',
    },
  });
  const retrieveResponseXML = await retrieveResponse.text();
  const xml = new DOMParser().parseFromString(retrieveResponseXML, 'text/xml');
  const overviewElements = xml.getElementsByTagNameNS(sdNS, 'sdOverviewList');
  if (!overviewElements) {
    return null;
  }
  const statementInfos = [];
  for (let i = 0, ii = overviewElements.length; i < ii; i++) {
    const overview = overviewElements.item(i);
    const sdId = overview?.getElementsByTagNameNS(commonNS, 'uuid').item(0)?.textContent;
    const date = overview?.getElementsByTagNameNS(commonNS, 'date').item(0)?.textContent;
    const status = overview?.getElementsByTagNameNS(commonNS, 'status').item(0)?.textContent;
    if (!sdId || !date || !status) {
      continue;
    }
    const referenceNumber =
      overview.getElementsByTagNameNS(commonNS, 'referenceNumber').item(0)?.textContent ||
      undefined;
    const verificationNumber =
      overview.getElementsByTagNameNS(commonNS, 'verificationNumber').item(0)?.textContent ||
      undefined;
    statementInfos.push({
      sdId,
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
export async function retrieveSdByInternalReference(internalReference) {
  const body = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:sd="http://ec.europa.eu/tracesnt/certificate/eudr/simplified-declaration/v3"
    xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
        ${getHeader()}
        <soapenv:Body>
            <sd:GetSdByInternalReferenceRequest>
                <sd:internalReference>${internalReference}</sd:internalReference>
            </sd:GetSdByInternalReferenceRequest>
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
          'http://ec.europa.eu/tracesnt/certificate/eudr/simplified-declaration/getSdByInternalReference',
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

    const overviewElements = xml.getElementsByTagNameNS(sdNS, 'sdOverviewList');
    const statements = [];
    for (let i = 0; i < overviewElements.length; i++) {
      const overview = /** @type {import('@xmldom/xmldom').Element} */ (overviewElements.item(i));
      const sdId = overview.getElementsByTagNameNS(commonNS, 'uuid').item(0)?.textContent;
      if (!sdId) {
        return { error: 'Invalid response from TRACES: no sdId' };
      }
      const date = overview.getElementsByTagNameNS(commonNS, 'date').item(0)?.textContent;
      if (!date) {
        return { error: 'Invalid response from TRACES: no date' };
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
export async function retrieveSdData(referenceNumber, verificationNumber) {
  const body = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:sd="http://ec.europa.eu/tracesnt/certificate/eudr/simplified-declaration/v3"
    xmlns:eudrCommon="http://ec.europa.eu/tracesnt/certificate/eudr/common/v3"
    xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
        ${getHeader()}
        <soapenv:Body>
            <sd:GetSdByIdentifiersRequest>
              <sd:referenceAndVerificationNumber>
                <eudrCommon:referenceNumber>${referenceNumber}</eudrCommon:referenceNumber>
                <eudrCommon:verificationNumber>${verificationNumber}</eudrCommon:verificationNumber>
              </sd:referenceAndVerificationNumber>
            </sd:GetSdByIdentifiersRequest>
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
        'http://ec.europa.eu/tracesnt/certificate/eudr/simplified-declaration/getSdByIdentifiers',
    },
  });
  const submitResponseXML = await submitResponse.text();
  const xml = new DOMParser().parseFromString(submitResponseXML, 'text/xml');
  const faultString = xml.getElementsByTagName('faultstring').item(0)?.textContent;
  const message = xml.getElementsByTagNameNS(errorNS, 'Message').item(0)?.textContent;
  const error = `${faultString ? faultString + ': ' : ''}${message || ''}`.trim();
  if (submitResponse.status >= 400) {
    console.error('TRACES getSdByIdentifiers error:', submitResponse.status, submitResponseXML);
    return {
      error: error || 'TRACES database currently unavailable, try again later',
    };
  }
  const statementElement = xml.getElementsByTagNameNS(sdNS, 'statement').item(0);
  if (!statementElement) {
    console.error(
      'TRACES getSdByIdentifiers: no statement element in response:',
      submitResponseXML,
    );
    return {
      error: 'No statement found',
    };
  }

  const commoditiesElements = statementElement.getElementsByTagNameNS(sdNS, 'commodities');
  /** @type {Array<CommodityDataWithKey>} */
  const commodities = [];
  for (let i = 0; i < commoditiesElements.length; i++) {
    const commodity = /** @type {import('@xmldom/xmldom').Element} */ (commoditiesElements.item(i));
    const hsCode = /** @type {import('~~/shared/utils/constants').HSCode} */ (
      commodity.getElementsByTagNameNS(sdNS, 'hsHeading').item(0)?.textContent
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
      // present. netWeight is always sent in V3 — for those commodities it is only
      // an estimate (density/average weight), so dividing it by 1000 would yield a
      // wrong amount. Soja has no supplementary unit and falls back to netWeight (t).
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
      existing.quantity = { ...existing.quantity, ...quantity };
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

  if (geolocationVisible && commodities.some((c) => !c.geojson)) {
    console.error(
      'TRACES getSdByIdentifiers: geoLocationConfidential=false but no geometryGeojson found.' +
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
