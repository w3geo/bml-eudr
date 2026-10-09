import { unref } from 'vue';
import { COMMODITIES, HS_HEADING } from './constants.js';

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
  return commodities
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
 * Whether the user data is complete and valid, so statements can be submitted.
 * @param {{ name?: string|null, address?: string|null, identifierType?: string|null, identifierValue?: string|null }|null|undefined} user
 * @returns {boolean}
 */
export function isUserDataValid(user) {
  return !!(
    user?.name?.trim() &&
    isValidAddress(user.address) &&
    user.identifierType &&
    user.identifierValue?.trim()
  );
}
