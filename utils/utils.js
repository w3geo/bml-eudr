/**
 * @param {number} number
 * @param {number} precision
 * @returns {number}
 */
export function toPrecision(number, precision) {
  return Math.round(number * 10 ** precision) / 10 ** precision;
}
