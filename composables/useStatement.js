import VectorSource from 'ol/source/Vector.js';
import { getArea } from 'ol/sphere';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';

/**
 * @typedef Geolocation
 * @property {import('vue').ComputedRef<number>} area
 * @property {import('vue').Ref<number>} quantity
 * @property {import('vue').Ref<import('ol/format/GeoJSON').GeoJSONFeatureCollection>} geojson
 * @property {VectorLayer} geolocationLayer
 * @property {VectorSource} geolocationSource
 */

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
  feature.set(
    'Area',
    feature.get('sl_flaeche_brutto_ha') || getArea(geometry, { projection: 'EPSG:3857' }) / 10000,
  );
}

/** @type {GeoJSON<import('ol/Feature.js').default<import('ol/geom/Polygon.js').default>>} */
const geojsonFormat = new GeoJSON({ featureProjection: 'EPSG:3857' });

/** @type {Object<string, Geolocation>} */
const geolocation = {};

/**
 * @param {import('~/utils/constants').EditCommodity} commodity
 * @returns {Geolocation}
 */
export function useStatement(commodity) {
  if (!geolocation[commodity]) {
    /** @type {VectorSource<import('ol/Feature.js').default<import('ol/geom/Polygon.js').default|import('ol/geom/MultiPolygon.js').default>>} */
    const geolocationSource = new VectorSource();

    /** @type {import('vue').Ref<import('ol/format/GeoJSON').GeoJSONFeatureCollection>} */
    const geojson = shallowRef(structuredClone(EMPTY_GEOJSON));

    function updateGeolocation() {
      const features = geolocationSource.getFeatures();
      geojson.value = geojsonFormat.writeFeaturesObject(features);
    }

    geolocationSource.on('addfeature', calculateArea);
    geolocationSource.on('changefeature', calculateArea);
    geolocationSource.on('change', updateGeolocation);

    const geolocationLayer = new VectorLayer({
      source: geolocationSource,
    });

    const area = computed(() => {
      return toPrecision(
        geojson.value.features.reduce((acc, feature) => {
          return acc + feature.properties?.Area || 0;
        }, 0),
        4,
      );
    });

    const quantity = ref(0);

    geolocation[commodity] = {
      geojson,
      area,
      quantity,
      geolocationLayer,
      geolocationSource,
    };
  }

  return geolocation[commodity];
}
