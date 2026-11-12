import { unref } from 'vue';
import { COMMODITIES, HS_HEADING, LOGIN_PROVIDED_FIELDS } from './constants.js';

/**
 * @param {import('../../server/utils/soap-traces.js').CommodityDataWithKey} commodity
 * @returns {string}
 */
export function getCommoditySummary(commodity) {
  /** @type {import('~~/shared/utils/constants').Commodity} */
  const commodityKey = commodity.key;
  const metadata = COMMODITIES[commodityKey];
  // Guard against unknown commodities (e.g. an HS heading TRACES returns that we
  // don't map): render nothing rather than crashing the whole statement view.
  if (!metadata) {
    return '';
  }
  const places = unref(commodity.geojson)?.features.length || 0;
  const address = unref(commodity.address);
  const location = places
    ? `${places} Ort${places === 1 ? '' : 'e'}`
    : address?.postalCode
      ? `${address.postalCode} ${address.city}`.trim()
      : 'Ort nicht geteilt';
  const hsHeadings = metadata.hsHeadings
    .filter((hsHeading) => unref(commodity.quantity)[hsHeading])
    .map(
      (hsHeading) =>
        `${unref(commodity.quantity)[hsHeading]?.toLocaleString('de-AT')} ${metadata.units} ${HS_HEADING[hsHeading] || hsHeading}`,
    );
  return hsHeadings.length ? `${hsHeadings.join(', ')}, ${location}` : '';
}

/**
 * @param {Array<import('../../server/utils/soap-traces.js').CommodityDataWithKey>} commodities
 * @returns {string}
 */
export function getCommoditiesSummary(commodities) {
  return commodities?.length
    ? `\nRohstoffe/Erzeugnisse:\n${commodities
        .map((commodity) => `${getCommoditySummary(commodity)}`)
        .join('\n')}`
    : '';
}

/** @typedef {{ street: string, postalCode: string, city: string }} PostalAddress */

/**
 * Parse a combined address string ("Street HouseNo, PostalCode City") into structured components.
 * Also accepts addresses without the comma or with an "A-" prefix on the postal code
 * (e.g. "Hart 4 5321 Pischelsdorf", "Hauptstraße 1, A-1010 Wien").
 * @param {string} address
 * @returns {{ street: string, postalCode: string, city: string } | null}
 */
export function parseAddress(address) {
  const match = address.trim().match(/^(.+)\s+(?:A-?)?(\d{4})\s+(.+)$/);
  if (match) {
    const [, rawStreet = '', postalCode = '', city = ''] = match;
    const street = rawStreet.replace(/,\s*$/, '').trim();
    if (street) {
      return { street, postalCode, city: city.trim() };
    }
  }
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
 * Combine structured address components into the stored address string
 * ("Street HouseNo, PostalCode City"), the inverse of `parseAddress`.
 * @param {{ street?: string, postalCode?: string, city?: string }} address
 * @returns {string}
 */
export function formatAddress({ street = '', postalCode = '', city = '' }) {
  return `${street.trim()}, ${postalCode.trim()} ${city.trim()}`;
}

/**
 * Normalize an address part the way it is submitted to TRACES: Unicode spaces (e.g. non-breaking
 * spaces from copy-paste), tabs and line breaks become a single blank, invisible characters (soft
 * hyphen, zero-width spaces) are removed, dashes become a hyphen and typographic apostrophes a
 * plain one, because TRACES rejects all of these in the producer address.
 * @param {string} [value]
 * @returns {string}
 */
export function normalizeAddressPart(value = '') {
  return value
    .replace(/[\u00ad\u200b-\u200d\u2060]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018\u2019\u201a\u201b\u00b4`\u02bc]/g, "'")
    .trim();
}

/**
 * @param {PostalAddress} address
 * @returns {PostalAddress}
 */
export function normalizeAddress(address) {
  return {
    street: normalizeAddressPart(address.street),
    postalCode: normalizeAddressPart(address.postalCode),
    city: normalizeAddressPart(address.city),
  };
}

/** Characters TRACES accepts in the producer street and city (determined by probing, the schema
 * does not tell): letters and numbers of any script, blanks and `. , - ' / :` */
const DISALLOWED_ADDRESS_CHARS = /[^\p{L}\p{N} .,'/:-]/gu;

/**
 * @param {string} [v]
 * @returns {true|string}
 */
function allowedAddressChars(v) {
  const invalid = [...new Set(normalizeAddressPart(v).match(DISALLOWED_ADDRESS_CHARS))];
  return (
    !invalid.length ||
    `Nicht erlaubt: ${invalid.join(' ')} (erlaubt sind Buchstaben, Ziffern, Leerzeichen und . , - ' / :)`
  );
}

/**
 * Validation rules for the structured address fields, usable as Vuetify `rules`. Values are
 * checked as they will be submitted, i.e. after `normalizeAddressPart`. They are at least as strict
 * as TRACES' business rules for the producer address.
 * Each rule returns `true` or an error message.
 */
export const ADDRESS_RULES = {
  street: [
    /** @param {string} [v] */
    (v) => !!normalizeAddressPart(v) || 'Straße und Hausnummer ist erforderlich',
    /** @param {string} [v] */
    (v) =>
      /\S \d/.test(normalizeAddressPart(v)) ||
      'Hausnummer fehlt oder ist nicht durch ein Leerzeichen getrennt',
    allowedAddressChars,
  ],
  postalCode: [
    /** @param {string} [v] */
    (v) => !!normalizeAddressPart(v) || 'PLZ ist erforderlich',
    /** @param {string} [v] */
    (v) => /^\d{4}$/.test(normalizeAddressPart(v)) || 'PLZ muss vierstellig sein',
  ],
  city: [
    /** @param {string} [v] */
    (v) => !!normalizeAddressPart(v) || 'Ort ist erforderlich',
    /** @param {string} [v] */
    (v) => {
      const city = normalizeAddressPart(v);
      return (city.length >= 2 && /\p{L}/u.test(city)) || 'Ort ist zu kurz';
    },
    allowedAddressChars,
  ],
};

/**
 * Turn a combined address string (as stored in the database or provided by eAMA) into a
 * `PostalAddress`. A string that cannot be parsed goes into `street`, so nothing is lost and the
 * address counts as incomplete.
 * @param {string|PostalAddress|null|undefined} address A string, or an address that is already
 * split, which is returned as is (e.g. from a session created before addresses were split).
 * @returns {PostalAddress|undefined}
 */
export function toPostalAddress(address) {
  if (!address) return undefined;
  if (typeof address !== 'string') return address;
  return parseAddress(address) ?? { street: address.trim(), postalCode: '', city: '' };
}

/**
 * @param {PostalAddress|null|undefined} address
 * @param {boolean} [checkRules=true] Whether to check the `ADDRESS_RULES`. When `false`, street,
 * postal code and city only need to be present, which is all we can ask of an address provided by
 * the login, because the user cannot change it.
 * @returns {boolean}
 */
export function isValidAddress(address, checkRules = true) {
  if (!address) return false;
  return /** @type {Array<keyof typeof ADDRESS_RULES>} */ (Object.keys(ADDRESS_RULES)).every(
    (key) =>
      checkRules
        ? ADDRESS_RULES[key].every((rule) => rule(address[key]) === true)
        : !!address[key]?.trim(),
  );
}

/**
 * Luhn checksum (0 for a valid number), used for the Austrian TIN and UID.
 * @param {string} digits
 * @returns {number}
 */
function luhnChecksum(digits) {
  let sum = 0;
  for (let i = digits.length - 1, double = false; i >= 0; --i, double = !double) {
    const digit = Number(digits[i]) * (double ? 2 : 1);
    sum += digit > 9 ? digit - 9 : digit;
  }
  return sum % 10;
}

/**
 * GS1 mod-10 check digit test for a GLN (13 digits, weights 3 and 1 alternating from the right).
 * @param {string} digits
 * @returns {boolean}
 */
function isValidGs1Checksum(digits) {
  let sum = 0;
  for (let i = digits.length - 1, weight = 1; i >= 0; --i, weight = 4 - weight) {
    sum += Number(digits[i]) * weight;
  }
  return sum % 10 === 0;
}

/**
 * Plausibility check of an identifier entered by the user. Austrian GLN, Austrian TIN
 * (Steuernummer) and Austrian UID are checked for format and check digit. LFBIS numbers (ONI) are only provided by
 * the login and not checked.
 * @param {string|null|undefined} type
 * @param {string|null|undefined} value
 * @returns {true|string} `true` or an error message
 */
export function validateIdentifier(type, value) {
  const trimmed = value?.trim() ?? '';
  switch (type) {
    case 'GLN':
      return (
        // GS1 Austria prefixes are 900-919
        (/^9[01]\d{11}$/.test(trimmed) && isValidGs1Checksum(trimmed)) ||
        'Keine gültige österreichische GLN (13 Ziffern, beginnend mit 900 bis 919)'
      );
    case 'TIN': {
      // Separators like in "12-345/6789" are allowed, they are removed when submitting to TRACES
      const digits = trimmed.replace(/[\s\-/]/g, '');
      return (
        (/^\d{9}$/.test(digits) && luhnChecksum(digits) === 0) ||
        'Keine gültige Steuernummer (9 Ziffern, z.B. 12-345/6789)'
      );
    }
    case 'VAT': {
      const digits = trimmed.match(/^ATU(\d{8})$/)?.[1];
      return (
        (!!digits && Number(digits[7]) === (16 - luhnChecksum(digits.slice(0, 7))) % 10) ||
        'Keine gültige UID (ATU und 8 Ziffern)'
      );
    }
    default:
      return true;
  }
}

/**
 * @typedef {{ name?: string|null, address?: PostalAddress|null, identifierType?: string|null, identifierValue?: string|null }} UserDataToValidate
 */

/**
 * The user data fields that are missing or invalid.
 * @param {UserDataToValidate|null|undefined} user
 * @param {import('./constants.js').LoginProvider} [loginProvider] Identifiers and addresses
 * provided by the login of this provider are not checked for plausibility, because the user
 * cannot change them.
 * @returns {Array<import('./constants.js').UserDataField>}
 */
export function getInvalidUserDataFields(user, loginProvider) {
  const providedFields = (loginProvider && LOGIN_PROVIDED_FIELDS[loginProvider]) || [];
  /** @type {Array<import('./constants.js').UserDataField>} */
  const invalid = [];
  if (!user?.name?.trim()) invalid.push('name');
  if (!isValidAddress(user?.address, !providedFields.includes('address'))) invalid.push('address');
  if (!user?.identifierType) invalid.push('identifierType');
  if (
    !user?.identifierValue?.trim() ||
    (!providedFields.includes('identifierValue') &&
      validateIdentifier(user.identifierType, user.identifierValue) !== true)
  ) {
    invalid.push('identifierValue');
  }
  return invalid;
}

/**
 * Whether the user data is complete and valid, so statements can be submitted.
 * @param {UserDataToValidate|null|undefined} user
 * @param {import('./constants.js').LoginProvider} [loginProvider] See `getInvalidUserDataFields`.
 * @returns {boolean}
 */
export function isUserDataValid(user, loginProvider) {
  return getInvalidUserDataFields(user, loginProvider).length === 0;
}
