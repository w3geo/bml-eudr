import { mdiCow, mdiForestOutline, mdiSprout } from '@mdi/js';

/** @typedef {keyof PRODUCTS} EditProduct */

/** @typedef {{ title: string, icon: string, units: string, factor?: number }} ProductData */

export const PRODUCTS = {
  /** @type {ProductData} */
  sojabohnen: {
    title: 'Sojabohnen',
    icon: mdiSprout,
    units: 't',
    factor: 4,
  },
  /** @type {ProductData} */
  rind: {
    title: 'Rinder',
    icon: mdiCow,
    units: 'Stk.',
  },
  /** @type {ProductData} */
  reinrassigesZuchtrind: {
    title: 'Reinrassige Zuchtrinder',
    icon: mdiCow,
    units: 'Stk.',
  },
  /** @type {ProductData} */
  rohholz: {
    title: 'Rohholz',
    icon: mdiForestOutline,
    units: 'm³',
    factor: 7.2,
  },
};
