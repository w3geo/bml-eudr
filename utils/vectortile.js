import VectorTileLayer from 'ol/layer/VectorTile.js';
import VectorTileSource from 'ol/source/VectorTile.js';
import Map from 'ol/Map.js';
import { createXYZ } from 'ol/tilegrid';
import { createEmpty, equals, extend } from 'ol/extent';
import { toFeature, toGeometry } from 'ol/render/Feature.js';
import polygonClipping from 'polygon-clipping';
import { MultiPolygon } from 'ol/geom';
import Feature from 'ol/Feature.js';
import MVT from 'ol/format/MVT';
import { getLayer } from 'ol-mapbox-style';
import { fromExtent } from 'ol/geom/Polygon';
import { getPointResolution } from 'ol/proj';

const { union } = polygonClipping;

/** @type {Object<string, Map>} */
const maps = {};

/**
 * @param {import('ol/Feature.js').FeatureLike} feature
 * @param {import('ol/source/VectorTile.js').default} source
 * @param {number} zoom
 * @returns {Map}
 */
function getMap(feature, source, zoom) {
  const key = feature.get('layer');
  if (!maps[key]) {
    const layer = new VectorTileLayer({
      renderMode: 'vector',
      source: new VectorTileSource({
        format: new MVT({
          layers: [key],
        }),
        tileLoadFunction: source.getTileLoadFunction(),
        tileUrlFunction: source.getTileUrlFunction(),
        tileGrid: createXYZ({ minZoom: zoom, maxZoom: zoom }),
      }),
    });
    const map = new Map({
      controls: [],
      interactions: [],
      layers: [layer],
      target: document.createElement('div'),
    });
    map.setSize([100, 100]);
    maps[key] = map;
  }
  return maps[key];
}

/**
 * @param {import('ol/Feature.js').FeatureLike} feature
 * @param {(feature: import('ol/render/Feature.js').default|import('ol/Feature.js').default) => (string|number|undefined)} getId
 * @param {import('ol/source/VectorTile.js').default} source
 * @param {number} zoom
 * @returns {Promise<Feature<MultiPolygon>>}
 */
export async function getCompleteFeature(feature, getId, source, zoom) {
  const id = getId(feature);
  if (id === undefined) {
    throw new Error('Feature has no id');
  }
  const map = getMap(feature, source, zoom);
  const layer = /** @type {VectorTileLayer} */ (map.getLayers().item(0));
  /** @type {import('ol/extent.js').Extent} */
  let extent = createEmpty();
  let newExtent = feature.getGeometry()?.getExtent() || createEmpty();
  /** @type {Array<import('ol/render/Feature.js').default>} */
  let features = [];
  while (!equals(extent, newExtent)) {
    extent = newExtent;
    map.getView().fit(extent);
    newExtent = await new Promise((resolve) =>
      map.once('rendercomplete', () => {
        features = layer
          .getFeaturesInExtent(extent)
          .filter((candidate) => getId(candidate) === getId(feature));
        resolve(
          features.reduce((acc, cur) => extend(acc, cur.getGeometry().getExtent()), createEmpty()),
        );
      }),
    );
  }
  const polygonCoordinates = /** @type {Array<import('polygon-clipping').Geom>} */ (
    features.map((feature) => toGeometry(feature).getCoordinates())
  );

  const multiPolygonCoordinates = union(polygonCoordinates[0], ...polygonCoordinates.slice(1));
  const completeFeature = new Feature({
    ...feature.getProperties(),
    geometry: new MultiPolygon(multiPolygonCoordinates),
  });
  completeFeature.setId(id);
  return completeFeature;
}

/**
 * @param {import('ol/layer/Group.js').default} layerGroup
 * @param {string} glLayer
 * @param {(feature: import('ol/Feature.js').FeatureLike) => (string|number|undefined)} getId
 * @param {number} zoom
 */
export function createGetFeatureAtPixel(layerGroup, glLayer, getId, zoom) {
  /**
   * @param {import('ol/Map.js').default} map
   * @param {import('ol/pixel.js').Pixel} pixel
   * @returns {Promise<import('ol/Feature.js').default>}
   */
  return async function getFeatureAtPixel(map, pixel) {
    const layer =
      /** @type {import('ol/layer/VectorTile.js').default<import('ol/source/VectorTile.js').default>} */ (
        getLayer(layerGroup, glLayer)
      );
    const source = /** @type {import('ol/source/VectorTile.js').default} */ (layer.getSource());
    const renderFeature = /** @type {import('ol/render/Feature.js').default} */ (
      map.forEachFeatureAtPixel(pixel, (feature) => feature, {
        layerFilter: (l) => {
          return l === layer;
        },
      })
    );
    if (renderFeature) {
      if (renderFeature.getGeometry()?.getType().endsWith('Point')) {
        const feature = toFeature(renderFeature);
        feature.setId(getId(renderFeature));
        return feature;
      }
      return await getCompleteFeature(renderFeature, getId, source, zoom);
    } else {
      const center = map.getCoordinateFromPixel(pixel);
      const resolution = getPointResolution(
        'EPSG:3857',
        map.getView().getResolution() || 1,
        center,
        'm',
      );
      const extent = [
        center[0] - resolution * 50,
        center[1] - resolution * 50,
        center[0] + resolution * 50,
        center[1] + resolution * 50,
      ];
      return new Feature(fromExtent(extent));
    }
  };
}
