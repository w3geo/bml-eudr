import { COMMODITIES, HS_HEADING } from './constants.js';

/**
 * @param {import('../../server/utils/soap-traces.js').CommodityDataWithKey} commodity
 * @returns {string}
 */
export function getCommoditySummary(commodity) {
  /** @type {import('~~/shared/utils/constants').Commodity} */
  const commodityKey = commodity.key;
  const places = unref(commodity.geojson)?.features.length || 0;
  const hsHeadings = COMMODITIES[commodityKey].hsHeadings
    .filter((hsHeading) => unref(commodity.quantity)[hsHeading])
    .map(
      (hsHeading) =>
        `${unref(commodity.quantity)[hsHeading]?.toLocaleString('de-AT')} ${COMMODITIES[commodityKey].units} ${HS_HEADING[hsHeading] || hsHeading}`,
    );
  return hsHeadings.length
    ? `${hsHeadings.join(', ')}, ${places ? `${places} Ort${places === 1 ? '' : 'e'}` : 'Ort nicht geteilt'}`
    : '';
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
