import { COMMODITIES } from '~/utils/constants';
import { randomBytes, createHash } from 'crypto';

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
    if (!commodity.summary) {
      continue;
    }
    const geoJSONBase64 = btoa(JSON.stringify(commodity.geojson));
    const commodityMetadata =
      COMMODITIES[/** @type {import('~/utils/constants').Commodity} */ (key)];
    commodityXMLs.push(`<v11:commodities>
      <v11:descriptors>
        <v11:descriptionOfGoods>${commodityMetadata.title}</v11:descriptionOfGoods>
        <v11:goodsMeasure>
          <v11:volume>88</v11:volume>
        </v11:goodsMeasure>
      </v11:descriptors>
      <v11:hsHeading>${commodityMetadata.hsHeading}</v11:hsHeading>
      <v11:producers>
        <v11:country>AT</v11:country>
        <v11:geometryGeojson>${geoJSONBase64}</v11:geometryGeojson>
      </v11:producers>
    </v11:commodities>`);
  }
  return commodityXMLs.join('\n');
}

/**
 * @param {Object<string, import('~/pages/statement.vue').CommodityData>} commodities
 * @param {import('~/server/db/schema/users').User} user
 * @param {string} internalReference
 * @returns {string}
 */
export function getSubmitXML(commodities, user, internalReference) {
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
            <v11:internalReferenceNumber>${internalReference}</v11:internalReferenceNumber>
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
            <v11:geoLocationConfidential>false</v11:geoLocationConfidential>
          </v1:statement>
        </v1:SubmitStatementRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;
}

/**
 * @param {string} identifier
 * @returns {string}
 */
export function getRetrieveXML(identifier) {
  const username = process.env.TRACES_USERNAME;
  const password = process.env.TRACES_AUTHKEY;
  const nonce = generateNonce();
  const created = getCreated();
  const expires = getExpires(created);
  const passwordDigest = generatePasswordDigest(nonce, created, password);

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
          <v1:identifier>${identifier}</v1:identifier>
        </v1:GetStatementInfoRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;
}
