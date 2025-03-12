import { apply, addMapboxLayer, getMapboxLayer, removeMapboxLayer } from 'ol-mapbox-style';
import LayerGroup from 'ol/layer/Group';
import { fetch as pmtilesFetch } from 'pmtiles-protocol';

/**
 * @typedef {Object} VectorTileComposable
 * @property {import('ol/layer/Group.js').default} layerGroup
 * @property {(map: import('ol/Map.js').default, pixel: import('ol/pixel.js').Pixel) => Promise<import('ol/Feature.js').default>} getFeatureAtPixel
 */

/** @type {Object<string, string>} */
const snarSubstring = {
  sojabohnen: 'SOJABOHNEN',
  rind: 'WEIDE',
  reinrassigesZuchtrind: 'WEIDE',
};

/**
 * @param {import('~/utils/constants').EditProduct} product
 * @returns {LayerGroup}
 */
function createAgraratlasLayer(product) {
  const agraratlas = new LayerGroup();
  apply(agraratlas, 'https://agraratlas.inspire.gv.at/map/style-pmtiles.json', {
    transformRequest: (url) => pmtilesFetch?.(url),
  }).then(() => {
    const schlaege = getMapboxLayer(agraratlas, 'invekos_schlaege_polygon-fill');
    addMapboxLayer(
      agraratlas,
      {
        ...schlaege,
        id: 'invekos_schlaege_polygon-not-product-fill',
        filter: ['!', ['in', snarSubstring[product], ['get', 'snar_bezeichnung']]],
      },
      'invekos_schlaege_polygon-fill',
    );
    addMapboxLayer(
      agraratlas,
      {
        ...schlaege,
        id: 'invekos_schlaege_polygon-product-fill',
        filter: ['in', snarSubstring[product], ['get', 'snar_bezeichnung']],
        paint: {
          ...schlaege.paint,
          'fill-color': 'rgba(255, 255, 0, 0.5)',
        },
      },
      'invekos_schlaege_polygon-fill',
    );
    removeMapboxLayer(agraratlas, 'invekos_schlaege_polygon-fill');
  });
  return agraratlas;
}

/**
 * @returns {LayerGroup}
 */
function createKatasterLayer() {
  const kataster = new LayerGroup();
  $fetch('https://kataster.bev.gv.at/styles/kataster/style_basic.json')
    .then(
      /**
       * @param {Object<String, *>} style
       */
      (style) => {
        style.sources['geolandbasemap'] = {
          type: 'raster',
          tiles: [
            'https://mapsneu.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png',
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: 'Grundkarte: <a href="https://basemap.at/">basemap.at</a>',
          bounds: [8.782379, 46.35877, 17.5, 49.037872],
        };
        const wald = style.layers.find(
          /** @param {Object<string, *>} layer */ (layer) => layer.id === 'Wald',
        );
        style.layers = [
          {
            id: 'basemap.at',
            type: 'raster',
            source: 'geolandbasemap',
          },
          {
            ...wald,
            paint: {
              ...wald.paint,
              'fill-color': 'rgba(255, 255, 0)',
              'fill-opacity': 0.5,
            },
          },
          {
            ...wald,
            id: 'wald-outline',
            type: 'line',
            paint: {
              'line-color': 'rgb(238, 90, 78)',
              'line-width': 2,
            },
          },
        ];
        apply(kataster, style);
      },
    )
    .catch(console.error);
  return kataster;
}

/** @type {Object<string, VectorTileComposable>} */
const placesByProduct = {};

/**
 * @param {import('~/utils/constants').EditProduct} product
 * @returns {VectorTileComposable}}
 */
export const usePlaces = (product) => {
  if (!placesByProduct[product]) {
    const layerGroup =
      product === 'rohholz' ? createKatasterLayer() : createAgraratlasLayer(product);
    const getFeatureAtPixel =
      product === 'rohholz'
        ? createGetFeatureAtPixel(layerGroup, 'Wald', (feature) => feature.getId(), 16)
        : createGetFeatureAtPixel(
            layerGroup,
            'invekos_schlaege_polygon-product-fill',
            (feature) => feature.get('localID'),
            15,
          );
    placesByProduct[product] = { layerGroup, getFeatureAtPixel };
  }
  return placesByProduct[product];
};
