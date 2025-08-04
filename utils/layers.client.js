import apply, { addMapboxLayer, getMapboxLayer, removeMapboxLayer } from 'ol-mapbox-style';
import GeoJSON from 'ol/format/GeoJSON';
import LayerGroup from 'ol/layer/Group';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector.js';
import { getArea } from 'ol/sphere';
import { fetch as pmtilesFetch } from 'pmtiles-protocol';

/** @type {GeoJSON<import('ol/Feature.js').default<import('ol/geom/Polygon.js').default>>} */
const geojsonFormat = new GeoJSON({ featureProjection: 'EPSG:3857' });

/**
 * @param {import('~/utils/constants').Commodity} commodity
 * @returns {LayerGroup}
 */
function createAgraratlasLayer(commodity) {
  const agraratlas = new LayerGroup();
  apply(agraratlas, 'https://agraratlas.inspire.gv.at/map/style-pmtiles.json', {
    transformRequest: (url) => pmtilesFetch?.(url),
  }).then(() => {
    const schlaege = getMapboxLayer(agraratlas, 'invekos_schlaege_polygon-fill');
    addMapboxLayer(
      agraratlas,
      {
        ...schlaege,
        id: 'invekos_schlaege_polygon-not-commodity-fill',
        filter: ['!', ['in', SNAR_SUBSTRING[commodity], ['get', 'snar_bezeichnung']]],
      },
      'invekos_schlaege_polygon-fill',
    );
    addMapboxLayer(
      agraratlas,
      {
        ...schlaege,
        id: 'invekos_schlaege_polygon-commodity-fill',
        filter: ['in', SNAR_SUBSTRING[commodity], ['get', 'snar_bezeichnung']],
        paint: {
          ...schlaege.paint,
          'fill-color': 'rgba(255, 255, 0, 0.5)',
        },
      },
      'invekos_schlaege_polygon-fill',
    );
    removeMapboxLayer(agraratlas, 'invekos_schlaege_polygon-fill');
    if (commodity === 'rind') {
      addMapboxLayer(agraratlas, {
        'id': 'invekos_hofstelle-point',
        'type': 'circle',
        'source': 'agrargis',
        'source-layer': 'invekos_hofstellen',
        'paint': {
          'circle-radius': 7,
          'circle-color': 'rgba(255, 255, 0, 0.5)',
          'circle-stroke-color': 'rgb(238, 90, 78)',
          'circle-stroke-width': 2,
        },
      });
    }
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

/** @typedef {(map: import('ol/Map.js').default, pixel: import('ol/pixel.js').Pixel) => Promise<import('ol/Feature.js').default>} GetFeatureAtPixel */

/**
 * @typedef {Object} CommodityLayerset
 * @property {import('ol/layer/Group.js').default} layerGroup
 * @property {GetFeatureAtPixel} getFeatureAtPixel
 */

/**
 * @param {import('~/utils/constants').Commodity} commodity
 * @returns {CommodityLayerset}}
 */
export function createCommodityLayerset(commodity) {
  const layerGroup =
    commodity === 'holz' ? createKatasterLayer() : createAgraratlasLayer(commodity);
  const getFeatureAtPixel =
    commodity === 'holz'
      ? createGetFeatureAtPixel(layerGroup, 'Wald', (feature) => feature.getId(), 16)
      : createGetFeatureAtPixel(
          layerGroup,
          'invekos_schlaege_polygon-commodity-fill',
          (feature) => feature.get('localID'),
          15,
        );
  return { layerGroup, getFeatureAtPixel };
}

/**
 * @param {Ref<import('geojson').FeatureCollection>} geojson
 * @returns {VectorLayer}
 */
export function createGeolocationLayer(geojson) {
  let updatingGeolocation = false;

  watch(geojson, () => {
    if (updatingGeolocation) {
      return;
    }
    geolocationSource.clear();
    geolocationSource.addFeatures(
      geojsonFormat.readFeatures(geojson.value, { featureProjection: 'EPSG:3857' }),
    );
  });

  /** @type {VectorSource<import('ol/Feature.js').default<import('ol/geom/Polygon.js').default|import('ol/geom/MultiPolygon.js').default>>} */
  const geolocationSource = new VectorSource();

  /**
   * @param {import('ol/source/Vector.js').VectorSourceEvent} e
   */
  function calculateArea(e) {
    const feature = e.feature;
    if (!feature) {
      return;
    }
    const geometry = feature.getGeometry();
    if (!geometry || !geometry.getType().endsWith('Polygon')) {
      return;
    }
    const area = e.type === 'addfeature' ? feature.get('sl_flaeche_brutto_ha') : undefined;
    feature.set(
      'Area',
      area === undefined ? getArea(geometry, { projection: 'EPSG:3857' }) / 10000 : area,
      e.type === 'addfeature',
    );
  }

  function updateGeolocation() {
    const features = geolocationSource.getFeatures();
    updatingGeolocation = true;
    geojson.value = geojsonFormat.writeFeaturesObject(features);
    nextTick(() => {
      updatingGeolocation = false;
    });
  }

  geolocationSource.on('addfeature', calculateArea);
  geolocationSource.on('changefeature', calculateArea);
  geolocationSource.on('change', updateGeolocation);

  const geolocationLayer = new VectorLayer({
    source: geolocationSource,
  });
  return geolocationLayer;
}
