import { mdiCow, mdiForestOutline, mdiSprout } from '@mdi/js';

/** @typedef {keyof COMMODITIES} Commodity */

/** @typedef {{ title: string, icon: string, units: string, factor?: number }} CommodityData */

export const COMMODITIES = {
  /** @type {CommodityData} */
  sojabohnen: {
    title: 'Sojabohnen',
    icon: mdiSprout,
    units: 't',
    factor: 4,
  },
  /** @type {CommodityData} */
  rind: {
    title: 'Rinder',
    icon: mdiCow,
    units: 'Stk.',
  },
  /** @type {CommodityData} */
  reinrassigesZuchtrind: {
    title: 'Reinrassige Zuchtrinder',
    icon: mdiCow,
    units: 'Stk.',
  },
  /** @type {CommodityData} */
  rohholz: {
    title: 'Rohholz',
    icon: mdiForestOutline,
    units: 'm³',
    factor: 7.2,
  },
};

export const EMPTY_GEOJSON = Object.freeze({
  type: 'FeatureCollection',
  features: [],
});
