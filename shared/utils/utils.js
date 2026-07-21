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
 * @param {string} address
 * @returns {{ street: string, postalCode: string, city: string } | null}
 */
export function parseAddress(address) {
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
