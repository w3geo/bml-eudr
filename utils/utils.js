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
  if (!commodity || !commodity.geojson.features.length) {
    return '';
  }
  /** @type {import('~/utils/constants').Commodity} */
  const commodityKey = commodity.key;
  const places = commodity.geojson.features.length;
  const hsHeadings = COMMODITIES[commodityKey].hsHeadings
    .filter((key) => commodity.quantity[key])
    .map(
      (key) =>
        `${commodity.quantity[key]?.toLocaleString('de-AT')} ${COMMODITIES[commodityKey].units} ${HS_HEADING[key] || key}`,
    );
  return `${places} Ort${places === 1 ? '' : 'e'}, ${hsHeadings.join(', ')}`;
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
