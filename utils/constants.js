import { mdiCow, mdiForestOutline, mdiSprout } from '@mdi/js';

/** @typedef {'sojabohnen' | 'rind' | 'reinrassigesZuchtrind' | 'rohholz'} Commodity */

/** @typedef {{ title: string, icon: string, units: 't' | 'Stk.' | 'm³', factor?: number, hsHeading: string }} CommodityMetadata */

/** @type {Record<Commodity, CommodityMetadata>} */
export const COMMODITIES = {
  sojabohnen: {
    title: 'Sojabohnen',
    icon: mdiSprout,
    units: 't',
    factor: 4,
    hsHeading: '1201',
  },
  rind: {
    title: 'Rinder',
    icon: mdiCow,
    units: 'Stk.',
    hsHeading: '010229',
  },
  reinrassigesZuchtrind: {
    title: 'Reinrassige Zuchtrinder',
    icon: mdiCow,
    units: 'Stk.',
    hsHeading: '010221',
  },
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

export const COMMODITY_KEYS = /** @type {Array<Commodity>} */ (Object.keys(COMMODITIES));
