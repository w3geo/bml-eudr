import { mdiCow, mdiForestOutline, mdiSprout } from '@mdi/js';

/** @typedef {keyof COMMODITIES} Commodity */

/** @typedef {{ title: string, icon: string, units: 't' | 'Stk.' | 'm³', factor?: number, hsHeading: string }} CommodityMetadata */

export const COMMODITIES = {
  /** @type {CommodityMetadata} */
  sojabohnen: {
    title: 'Sojabohnen',
    icon: mdiSprout,
    units: 't',
    factor: 4,
    hsHeading: '1201',
  },
  /** @type {CommodityMetadata} */
  rind: {
    title: 'Rinder',
    icon: mdiCow,
    units: 'Stk.',
    hsHeading: '010229',
  },
  /** @type {CommodityMetadata} */
  reinrassigesZuchtrind: {
    title: 'Reinrassige Zuchtrinder',
    icon: mdiCow,
    units: 'Stk.',
    hsHeading: '010221',
  },
  /** @type {CommodityMetadata} */
  rohholz: {
    title: 'Rohholz',
    icon: mdiForestOutline,
    units: 'm³',
    factor: 7.2,
    hsHeading: '4403',
  },
};

export const EMPTY_GEOJSON = Object.freeze({
  type: 'FeatureCollection',
  features: [],
});
