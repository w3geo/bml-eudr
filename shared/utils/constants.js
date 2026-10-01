import { mdiCow, mdiForestOutline, mdiSprout } from '@mdi/js';

/** @typedef {'sojabohnen' | 'rind' | 'holz'} Commodity */

/**
 * @typedef {Object} CommodityMetadata
 * @property {string} title
 * @property {string} icon
 * @property {'t' | 'Stk.' | 'm³'} units
 * @property {number} [yieldPerHectare]
 * @property {Array<HSCode>} hsHeadings
 * @property {string} [hint]
 */

export const HS_HEADING = {
  '0102': 'Rinder',
  '120190': 'Sojabohnen',
  '4403': 'Rohholz',
  '4401': 'Brennholz',
};

/** @typedef {keyof HS_HEADING} HSCode */

/**
 * HS codes of previously submitted statements that TRACES no longer offers, mapped
 * to the heading that replaces them.
 * @type {Record<string, HSCode>}
 */
export const LEGACY_HS_HEADING = {
  '010229': '0102', // Rinder
  '010221': '0102', // Zuchtrinder
  '1201': '120190', // Sojabohnen
};

/** @type {Record<Commodity, CommodityMetadata>} */
export const COMMODITIES = {
  sojabohnen: {
    title: 'Sojabohnen',
    icon: mdiSprout,
    units: 't',
    yieldPerHectare: 4,
    hsHeadings: ['120190'],
    hint: 'Bitte geben Sie hier Ihre durchschnittliche jährliche Sojaproduktion an',
  },
  rind: {
    title: 'Rinder',
    icon: mdiCow,
    units: 'Stk.',
    hsHeadings: ['0102'],
  },
  holz: {
    title: 'Holz',
    icon: mdiForestOutline,
    units: 'm³',
    hsHeadings: ['4403', '4401'],
    hint: 'Bitte geben Sie hier Ihre durchschnittliche jährliche Holzproduktion an',
  },
};

/**
 * Feldstücknutzungsart (`fnar_code`) superset that schläge of each commodity belong to.
 * @type {Object<string, string>}
 */
export const FNAR = {
  sojabohnen: 'A',
  rind: 'G',
};

export const EMPTY_GEOJSON = Object.freeze({
  type: 'FeatureCollection',
  features: [],
});

export const COMMODITY_KEYS = /** @type {Array<Commodity>} */ (Object.keys(COMMODITIES));

/** @typedef {'OTP' | 'IDA' | 'AMA' | 'USP'} LoginProvider */

/** @type {Record<LoginProvider, Array<keyof import('~~/server/db/schema/users.js').User>>} */
export const LOGIN_PROVIDED_FIELDS = {
  OTP: [],
  IDA: ['name', 'address'],
  AMA: ['name', 'address', 'identifierType', 'identifierValue'],
  USP: ['name', 'address', 'identifierType', 'identifierValue'],
};

export const editableUserDataFields = ['name', 'address', 'identifierType', 'identifierValue'];

const VALID_EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

/**
 * @param {string} email
 * @returns {true|string}
 */
export const validateEmail = (email) => {
  return VALID_EMAIL_REGEX.test(email) || 'Bitte eine gültige E-Mail-Adresse eingeben';
};
