/**
 * @param {number} number
 * @param {number} precision
 * @returns {number}
 */
export function toPrecision(number, precision) {
  return Math.round(number * 10 ** precision) / 10 ** precision;
}

/**
 * @param {import('vue').Ref<import('~~/server/db/schema/users').User|undefined|null>} userData
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
