import { mdiCow, mdiForestOutline, mdiSprout } from '@mdi/js';

/** @typedef {'sojabohnen' | 'rind' | 'holz'} Commodity */

/**
 * @typedef {Object} CommodityMetadata
 * @property {string} title
 * @property {string} icon
 * @property {'t' | 'Stk.' | 'm³'} units
 * @property {number} [factor]
 * @property {Array<HSCode>} hsHeadings
 */

export const HS_HEADING = {
  '010229': 'Rinder',
  '010221': 'Zuchtrinder',
  '1201': 'Sojabohnen',
  '4403': 'Rohholz',
  '4401': 'Brennholz',
};

/** @typedef {keyof HS_HEADING} HSCode */

/** @type {Record<Commodity, CommodityMetadata>} */
export const COMMODITIES = {
  sojabohnen: {
    title: 'Sojabohnen',
    icon: mdiSprout,
    units: 't',
    factor: 4,
    hsHeadings: ['1201'],
  },
  rind: {
    title: 'Rinder',
    icon: mdiCow,
    units: 'Stk.',
    hsHeadings: ['010229', '010221'],
  },
  holz: {
    title: 'Holz',
    icon: mdiForestOutline,
    units: 'm³',
    factor: 7.2,
    hsHeadings: ['4403', '4401'],
  },
};

/** @type {Object<string, string>} */
export const SNAR_SUBSTRING = {
  sojabohnen: 'SOJABOHNEN',
  rind: 'WEIDE',
  reinrassigesZuchtrind: 'WEIDE',
};

export const EMPTY_GEOJSON = Object.freeze({
  type: 'FeatureCollection',
  features: [],
});

export const COMMODITY_KEYS = /** @type {Array<Commodity>} */ (Object.keys(COMMODITIES));

const VALID_EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

/**
 * @param {string} email
 * @returns {true|string}
 */
export const validateEmail = (email) => {
  return VALID_EMAIL_REGEX.test(email) || 'Bitte eine gültige E-Mail-Adresse eingeben';
};
