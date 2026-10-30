import { test } from 'node:test';
import assert from 'node:assert/strict';
import { removeHoles } from '../server/utils/remove-holes.js';

/**
 * @param {import('geojson').Position[]} ring
 * @returns {number}
 */
function ringArea(ring) {
  let sum = 0;
  for (let i = 0, ii = ring.length - 1; i < ii; ++i) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(sum) / 2;
}

/**
 * @param {import('geojson').Position[][]} polygon
 * @returns {number}
 */
function polygonArea(polygon) {
  return polygon.reduce((area, ring, i) => area + (i === 0 ? 1 : -1) * ringArea(ring), 0);
}

/**
 * @param {number} minX
 * @param {number} minY
 * @param {number} maxX
 * @param {number} maxY
 * @returns {import('geojson').Position[]}
 */
function box(minX, minY, maxX, maxY) {
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY],
  ];
}

test('splits a polygon with holes into hole-free polygons of the same area', () => {
  /** @type {import('geojson').Position[][]} */
  const coordinates = [
    box(0, 0, 10, 10),
    box(2, 2, 4, 4).reverse(),
    box(6, 3, 8, 5).reverse(),
    box(2, 6, 4, 8).reverse(),
  ];
  /** @type {import('geojson').FeatureCollection<import('geojson').Geometry | null>} */
  const geojson = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { name: 'a' }, geometry: { type: 'Polygon', coordinates } },
    ],
  };
  const result = removeHoles(geojson);
  assert.ok(result.features.length > 1);
  let area = 0;
  for (const feature of result.features) {
    assert.deepEqual(feature.properties, { name: 'a' });
    assert.equal(feature.geometry?.type, 'Polygon');
    const polygon = /** @type {import('geojson').Polygon} */ (feature.geometry).coordinates;
    assert.equal(polygon.length, 1);
    area += polygonArea(polygon);
  }
  assert.equal(area, polygonArea(coordinates));
});

test('leaves features without holes untouched', () => {
  /** @type {import('geojson').FeatureCollection<import('geojson').Geometry | null>} */
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'MultiPolygon', coordinates: [[box(0, 0, 1, 1)], [box(2, 2, 3, 3)]] },
      },
      { type: 'Feature', properties: {}, geometry: null },
    ],
  };
  assert.deepEqual(removeHoles(geojson), geojson);
});
