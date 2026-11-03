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
 * Validation rules for the structured address fields, usable as Vuetify `rules`.
 * Each rule returns `true` or an error message.
 */
export const ADDRESS_RULES = {
  street: [
    /** @param {string} [v] */
    (v) => !!v?.trim() || 'Straße und Hausnummer ist erforderlich',
  ],
  postalCode: [
    /** @param {string} [v] */
    (v) => !!v?.trim() || 'PLZ ist erforderlich',
    /** @param {string} [v] */
    (v) => /^\d{4}$/.test(v?.trim() ?? '') || 'PLZ muss vierstellig sein',
  ],
  city: [
    /** @param {string} [v] */
    (v) => !!v?.trim() || 'Ort ist erforderlich',
  ],
};

/**
 * @param {string|null|undefined} address Combined address string
 * @returns {boolean}
 */
export function isValidAddress(address) {
  const parsed = address ? parseAddress(address) : null;
  return (
    !!parsed &&
    /** @type {Array<keyof typeof ADDRESS_RULES>} */ (Object.keys(ADDRESS_RULES)).every((key) =>
      ADDRESS_RULES[key].every((rule) => rule(parsed[key]) === true),
    )
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
 * Plausibility check of an identifier entered by the user. GLN, Austrian TIN (Steuernummer) and
 * Austrian UID are checked for format and check digit. LFBIS numbers (ONI) are only provided by
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
        (/^\d{13}$/.test(trimmed) && isValidGs1Checksum(trimmed)) ||
        'Keine gültige GLN (13 Ziffern)'
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
 * Whether the user data is complete and valid, so statements can be submitted.
 * @param {{ name?: string|null, address?: string|null, identifierType?: string|null, identifierValue?: string|null }|null|undefined} user
 * @param {import('./constants.js').LoginProvider} [loginProvider] Identifiers provided by the
 * login of this provider are not checked for plausibility, because the user cannot change them.
 * @returns {boolean}
 */
export function isUserDataValid(user, loginProvider) {
  const identifierProvided =
    !!loginProvider && LOGIN_PROVIDED_FIELDS[loginProvider]?.includes('identifierValue');
  return !!(
    user?.name?.trim() &&
    isValidAddress(user.address) &&
    user.identifierType &&
    user.identifierValue?.trim() &&
    (identifierProvided || validateIdentifier(user.identifierType, user.identifierValue) === true)
  );
}
