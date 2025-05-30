import { COMMODITIES, HS_HEADING } from '~/utils/constants';
import { randomBytes, createHash } from 'crypto';
import { DOMParser } from '@xmldom/xmldom';

/**
 * @typedef {Object} StatementInfo
 * @property {string} identifier
 * @property {string} [referenceNumber]
 * @property {string} [verificationNumber]
 * @property {import('../db/schema/statements').TracesStatus} status
 * @property {Date} date
 */

const errorNS = 'http://ec.europa.eu/sanco/tracesnt/error/v01';
const submissionNS = 'http://ec.europa.eu/tracesnt/certificate/eudr/submission/v1';
const retrievalNS = 'http://ec.europa.eu/tracesnt/certificate/eudr/retrieval/v1';

const treeSpeciesNames = [
  ['Picea abies', 'Gemeine Fichte'],
  ['Pinus sylvestris', 'Waldkiefer'],
  ['Larix decidua', 'Europäische Lärche'],
  ['Fagus sylvatica', 'Rotbuche'],
  ['Quercus robur', 'Stieleiche'],
  ['Quercus petraea', 'Traubeneiche'],
  ['Acer pseudoplatanus', 'Bergahorn'],
  ['Fraxinus excelsior', 'Gemeine Esche'],
  ['Abies alba', 'Weißtanne'],
  ['Betula pendula', 'Hänge-Birke'],
  ['Alnus glutinosa', 'Schwarzerle'],
  ['Carpinus betulus', 'Hainbuche'],
  ['Populus tremula', 'Zitterpappel'],
  ['Tilia cordata', 'Winterlinde'],
  ['Ulmus glabra', 'Bergulme'],
  ['Pseudotsuga menziesii', 'Douglasie'],
  ['Castanea sativa', 'Esskastanie'],
  ['Acer campestre', 'Feldahorn'],
  ['Prunus avium', 'Vogelkirsche'],
  ['Salix alba', 'Silber-Weide'],
];

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

/**
 * @param {Object<string, import('~/pages/statement.vue').CommodityData>} commodities
 */
function getCommoditiesXML(commodities) {
  const commodityXMLs = [];
  for (const key in commodities) {
    const commodity = commodities[key];
    const hsCodes = /** @type {Array<import('~/utils/constants').HSCode>} */ (
      Object.keys(commodity.quantity)
    );
    for (const hsCode of hsCodes) {
      const geoJSONBase64 = btoa(JSON.stringify(commodity.geojson));

      const quantityUnits =
        COMMODITIES[/** @type {import('~/utils/constants.js').Commodity} */ (key)].units;

      const speciesInfo =
        key === 'holz'
          ? treeSpeciesNames
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
      const quantity = /** @type {number} */ (commodity.quantity[hsCode]);
      switch (quantityUnits) {
        case 'm³':
          quantityInfo = `<v11:volume>${quantity}</v11:volume>`;
          break;
        case 't':
          quantityInfo = `<v11:netWeight>${quantity * 1000}</v11:netWeight>`;
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
 * @param {Object<string, import('~/pages/statement.vue').CommodityData>} commodities
 * @param {boolean} geolocationVisible
 * @param {import('~/server/db/schema/users').User} user
 * @returns {string}
 */
function getSubmitXML(commodities, geolocationVisible, user) {
  const username = process.env.TRACES_USERNAME;
  const password = process.env.TRACES_AUTHKEY;
  const nonce = generateNonce();
  const created = getCreated();
  const expires = getExpires(created);
  const passwordDigest = generatePasswordDigest(nonce, created, password);
  const commoditiesXML = getCommoditiesXML(commodities);

  return `<?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:v1="http://ec.europa.eu/tracesnt/certificate/eudr/submission/v1"
      xmlns:v11="http://ec.europa.eu/tracesnt/certificate/eudr/model/v1"
      xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
      <soapenv:Header>
        <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
          xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" soapenv:mustUnderstand="1">
          <wsu:Timestamp wsu:Id="TS-541F39C6FDB97C7A1B171509172198888">
            <wsu:Created>${created}</wsu:Created>
            <wsu:Expires>${expires}</wsu:Expires>
          </wsu:Timestamp>
          <wsse:UsernameToken wsu:Id="UsernameToken-541F39C6FDB97C7A1B171509172198787">
            <wsse:Username>${username}</wsse:Username>
            <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${passwordDigest}</wsse:Password>
            <wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonce}</wsse:Nonce>
            <wsu:Created>${created}</wsu:Created>
          </wsse:UsernameToken>
        </wsse:Security>
        <v4:WebServiceClientId>eudr-test</v4:WebServiceClientId>
      </soapenv:Header>
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
  const username = process.env.TRACES_USERNAME;
  const password = process.env.TRACES_AUTHKEY;
  const nonce = generateNonce();
  const created = getCreated();
  const expires = getExpires(created);
  const passwordDigest = generatePasswordDigest(nonce, created, password);
  const identifiersXML = identifiers
    .map((identifier) => `<v1:identifier>${identifier}</v1:identifier>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:v1="http://ec.europa.eu/tracesnt/certificate/eudr/retrieval/v1"
      xmlns:v4="http://ec.europa.eu/sanco/tracesnt/base/v4">
      <soapenv:Header>
        <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
          xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" soapenv:mustUnderstand="1">
          <wsu:Timestamp wsu:Id="TS-FC74784C4EFD20748F17171497363004">
            <wsu:Created>${created}</wsu:Created>
            <wsu:Expires>${expires}</wsu:Expires>
          </wsu:Timestamp>
          <wsse:UsernameToken wsu:Id="UsernameToken-FC74784C4EFD20748F17171497363003">
            <wsse:Username>${username}</wsse:Username>
            <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${passwordDigest}</wsse:Password>
            <wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonce}</wsse:Nonce>
            <wsu:Created>${created}</wsu:Created>
          </wsse:UsernameToken>
        </wsse:Security>
        <v4:WebServiceClientId>eudr-test</v4:WebServiceClientId>
      </soapenv:Header>
      <soapenv:Body>
        <v1:GetStatementInfoRequest>
          ${identifiersXML}
        </v1:GetStatementInfoRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;
}

/**
 * @param {Object<string, import('~/pages/statement.vue').CommodityData>} commodities
 * @param {boolean} geolocationVisible
 * @param {import('~/server/db/schema/users').User} user
 * @returns {Promise<{ identifier: string | undefined, error: string | undefined }>}
 */
export async function submitDDS(commodities, geolocationVisible, user) {
  const submitResponse = await fetch(
    'https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRSubmissionServiceV1',
    {
      method: 'POST',
      body: getSubmitXML(commodities, geolocationVisible, user),
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://ec.europa.eu/tracesnt/certificate/eudr/submission/submitDds',
      },
    },
  );
  const submitResponseXML = await submitResponse.text();
  const xml = new DOMParser().parseFromString(submitResponseXML, 'text/xml');
  const error =
    xml.getElementsByTagName('faultstring').item(0)?.textContent ||
    xml.getElementsByTagNameNS(errorNS, 'Message').item(0)?.textContent ||
    undefined;
  if (submitResponse.status >= 500) {
    return {
      identifier: undefined,
      error: error || 'TRACES database currently unavailable, try again later',
    };
  }

  const identifier =
    xml.getElementsByTagNameNS(submissionNS, 'ddsIdentifier').item(0)?.textContent || undefined;

  return { identifier, error };
}

/**
 * @param {Array<string>} identifiers TRACES identifiers
 * @returns {Promise<Array<StatementInfo> | null>} DDS info or null in case of an error
 */
export async function retrieveDDS(identifiers) {
  const retrieveXML = getRetrieveXML(identifiers);
  const retrieveResponse = await fetch(
    'https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRRetrievalServiceV1',
    {
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
    const identifier = statementInfo
      ?.getElementsByTagNameNS(retrievalNS, 'identifier')
      .item(0)?.textContent;
    const date = statementInfo?.getElementsByTagNameNS(retrievalNS, 'date').item(0)?.textContent;
    const status = statementInfo
      ?.getElementsByTagNameNS(retrievalNS, 'status')
      .item(0)?.textContent;
    if (!identifier || !date || !status) {
      continue;
    }
    const referenceNumber =
      statementInfo.getElementsByTagNameNS(retrievalNS, 'referenceNumber').item(0)?.textContent ||
      undefined;
    const verificationNumber =
      statementInfo.getElementsByTagNameNS(retrievalNS, 'verificationNumber').item(0)
        ?.textContent || undefined;
    statementInfos.push({
      identifier,
      referenceNumber,
      verificationNumber,
      status: /** @type {import('../db/schema/statements').TracesStatus} */ (status),
      date: new Date(date),
    });
  }
  return statementInfos;
}
