/**
 * @param {number} number
 * @param {number} precision
 * @returns {number}
 */
export function toPrecision(number, precision) {
  return Math.round(number * 10 ** precision) / 10 ** precision;
}

/**
 * @param {import('~/pages/statement.vue').CommodityDataWithKey} commodity
 * @returns {string}
 */
export function getCommoditySummary(commodity) {
  if (!commodity || !unref(commodity.geojson).features.length) {
    return '';
  }
  /** @type {import('~/utils/constants').Commodity} */
  const commodityKey = commodity.key;
  const places = unref(commodity.geojson).features.length;
  const hsHeadings = COMMODITIES[commodityKey].hsHeadings
    .filter((hsHeading) => unref(commodity.quantity)[hsHeading])
    .map(
      (hsHeading) =>
        `${unref(commodity.quantity)[hsHeading]?.toLocaleString('de-AT')} ${COMMODITIES[commodityKey].units} ${HS_HEADING[hsHeading] || hsHeading}`,
    );
  return `${places} Ort${places === 1 ? '' : 'e'}, ${hsHeadings.join(', ')}`;
}

/**
 * @param {Array<import('~/pages/statement.vue').CommodityDataWithKey>} commodities
 * @returns {string}
 */
export function getCommoditiesSummary(commodities) {
  return commodities
    ? `\nRohstoffe/Erzeugnisse:\n${commodities
        .filter((commodity) => unref(commodity.geojson).features.length)
        .map((commodity) => `${getCommoditySummary(commodity)}`)
        .join('\n')}`
    : '';
}

/**
 * @param {import('vue').Ref<import('../server/db/schema/users').User|undefined|null>} userData
 * @returns {Promise<void>}
 */
export async function saveUserData(userData) {
  const body = userData.value;
  if (!body) {
    return;
  }
  await $fetch('/api/users/me', {
    method: 'PUT',
    body,
  });
}

/**
 * @param {import('geojson').FeatureCollection} geojson
 * @returns {number}
 */
export function calculateAreaFromGeoJSON(geojson) {
  return toPrecision(
    geojson.features.reduce((acc, feature) => {
      return acc + feature.properties?.Area || 0;
    }, 0),
    4,
  );
}
