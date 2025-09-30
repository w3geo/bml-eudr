/** @typedef {'GLN'|'TIN'|'VAT'} IdentifierType */

/**
 * @typedef {Object} EditableUserData
 * @property {string} name
 * @property {string} address
 * @property {IdentifierType} identifierType
 * @property {string} identifierValue
 */

/**
 * @param {number} number
 * @param {number} precision
 * @returns {number}
 */
export function toPrecision(number, precision) {
  return Math.round(number * 10 ** precision) / 10 ** precision;
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
