import { mdiCow, mdiForestOutline, mdiSprout } from '@mdi/js';

/** @typedef {keyof PRODUCTS} EditProduct */

export const PRODUCTS = {
  sojabohnen: {
    title: 'Sojabohnen',
    icon: mdiSprout,
  },
  rind: {
    title: 'Rinder',
    icon: mdiCow,
  },
  reinrassigesZuchtrind: {
    title: 'Reinrassige Zuchtrinder',
    icon: mdiCow,
  },
  rohholz: {
    title: 'Rohholz',
    icon: mdiForestOutline,
  },
};
