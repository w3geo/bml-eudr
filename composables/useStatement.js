import VectorSource from 'ol/source/Vector.js';
import { getArea } from 'ol/sphere';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';

/**
 * @typedef Use
 * @property {import('vue').ComputedRef<number>} area
 * @property {import('vue').Ref<Quantity>} quantity
 * @property {import('vue').Ref<import('ol/format/GeoJSON').GeoJSONFeatureCollection>} geojson
 * @property {VectorLayer} geolocationLayer
 * @property {VectorSource} geolocationSource
 * @property {() => void} createSnapshot
 * @property {() => void} restoreSnapshot
 * @property {() => void} clear
 * @property {import('vue').Ref<boolean>} modifiedSinceSnapshot
 */

/**
 * @typedef {Partial<Record<import('~/utils/constants').HSCode, number>>} Quantity
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
  const area = e.type === 'addfeature' ? feature.get('sl_flaeche_brutto_ha') : undefined;
  feature.set(
    'Area',
    area === undefined ? getArea(geometry, { projection: 'EPSG:3857' }) / 10000 : area,
    e.type === 'addfeature',
  );
}

/** @type {GeoJSON<import('ol/Feature.js').default<import('ol/geom/Polygon.js').default>>} */
const geojsonFormat = new GeoJSON({ featureProjection: 'EPSG:3857' });

/** @type {Object<string, Use>} */
const use = {};

/**
 * @param {import('~/utils/constants').Commodity} commodity
 * @returns {Use}
 */
export function useStatement(commodity) {
  if (!use[commodity]) {
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

    /** @type {import('vue').Ref<Quantity>} */
    const quantity = ref({});

    const modifiedSinceSnapshot = ref(false);
    watch([quantity, geojson], () => {
      modifiedSinceSnapshot.value = true;
    });

    /** @type {{quantity: Quantity, geojson: import('geojson').FeatureCollection}|null} */
    let snapshot = null;

    function createSnapshot() {
      snapshot = {
        quantity: structuredClone(toRaw(quantity.value)),
        geojson: structuredClone(geojson.value),
      };
      modifiedSinceSnapshot.value = false;
    }

    function restoreSnapshot() {
      if (snapshot) {
        quantity.value = snapshot.quantity;
        geojson.value = snapshot.geojson;
        geolocationSource.clear();
        geolocationSource.addFeatures(
          geojsonFormat.readFeatures(geojson.value, { featureProjection: 'EPSG:3857' }),
        );
      }
      snapshot = null;
      modifiedSinceSnapshot.value = false;
    }

    function clear() {
      quantity.value = {};
      geojson.value = structuredClone(EMPTY_GEOJSON);
      geolocationSource.clear();
    }

    use[commodity] = {
      geojson,
      area,
      quantity,
      geolocationLayer,
      geolocationSource,
      createSnapshot,
      restoreSnapshot,
      modifiedSinceSnapshot,
      clear,
    };
  }

  return use[commodity];
}
