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
  1201: 'Sojabohnen',
  4401: 'Brennholz',
  4403: 'Rohholz',
};

/** @typedef {keyof HS_HEADING} HSCode */

/** @type {Record<Commodity, CommodityMetadata>} */
export const COMMODITIES = {
  sojabohnen: {
    title: 'Sojabohnen',
    icon: mdiSprout,
    units: 't',
    factor: 4,
    hsHeadings: [1201],
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
    hsHeadings: [4403, 4401],
  },
};

export const EMPTY_GEOJSON = Object.freeze({
  type: 'FeatureCollection',
  features: [],
});

export const COMMODITY_KEYS = /** @type {Array<Commodity>} */ (Object.keys(COMMODITIES));
