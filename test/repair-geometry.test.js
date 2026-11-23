import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repairGeometry } from '../shared/utils/repair-geometry.js';
import { getGeometryError } from '../shared/utils/polygon-validity.js';

const X = 15.5;
const Y = 48.2;
const D = 0.001;
/** @param {number} dx @param {number} dy @returns {[number, number]} */
const p = (dx, dy) => [+(X + dx * D).toFixed(6), +(Y + dy * D).toFixed(6)];
const square = [p(0, 0), p(1, 0), p(1, 1), p(0, 1), p(0, 0)];
/** @param {number} ox @param {number} oy */
const squareAt = (ox, oy) =>
  square.map(([x, y]) => [+(x + ox * D).toFixed(6), +(y + oy * D).toFixed(6)]);
/** @param {any} coordinates @returns {import('geojson').Polygon} */
const polygon = (coordinates) => ({ type: 'Polygon', coordinates });

/**
 * @param {import('geojson').Geometry | null} geometry
 * @returns {number}
 */
function countPolygons(geometry) {
  if (geometry?.type === 'Polygon') {
    return 1;
  }
  return geometry?.type === 'MultiPolygon' ? geometry.coordinates.length : 0;
}

test('keeps valid geometries unchanged', () => {
  for (const geometry of [
    polygon([square]),
    polygon([[...square].reverse()]),
    { type: 'MultiPolygon', coordinates: [[square], [squareAt(0.5, 0)]] },
    /** @type {import('geojson').Point} */ ({ type: 'Point', coordinates: p(0, 0) }),
  ]) {
    const result = repairGeometry(/** @type {import('geojson').Geometry} */ (geometry));
    assert.equal(result.changed, false);
    assert.equal(result.geometry, geometry);
  }
});

test('repairs everything TRACES rejects', () => {
  /** @type {Record<string, [import('geojson').Geometry, number]>} */
  const cases = {
    'bowtie': [polygon([[p(0, 0), p(1, 1), p(1, 0), p(0, 1), p(0, 0)]]), 2],
    'self-touching': [
      polygon([[p(0, 0), p(1, 0), p(1, 1), p(2, 1), p(2, 2), p(1, 2), p(1, 1), p(0, 1), p(0, 0)]]),
      2,
    ],
    'near-touching': [
      polygon([
        [
          p(0, 0),
          p(1, 0),
          [X + D, Y + D + 0.0000001],
          p(2, 1),
          p(2, 2),
          p(1, 2),
          [X + D, Y + D + 0.0000004],
          p(0, 1),
          p(0, 0),
        ],
      ]),
      2,
    ],
    'unclosed': [polygon([square.slice(0, 4)]), 1],
    'spike': [
      polygon([[p(0, 0), p(1, 0), p(1, 0.5), p(2, 0.5), p(1, 0.5), p(1, 1), p(0, 1), p(0, 0)]]),
      1,
    ],
    'hole-outside': [polygon([square, squareAt(3, 3).reverse()]), 1],
    'hole-touching-shell': [
      polygon([
        [p(0, 0), p(4, 0), p(4, 4), p(0, 4), p(0, 0)],
        [p(0, 2), p(2, 1), p(2, 3), p(0, 2)],
      ]),
      2,
    ],
    'invalid-part': [
      {
        type: 'MultiPolygon',
        coordinates: [[squareAt(3, 0)], [[p(0, 0), p(1, 1), p(1, 0), p(0, 1), p(0, 0)]]],
      },
      3,
    ],
  };
  for (const [name, [geometry, polygons]] of Object.entries(cases)) {
    assert.notEqual(typeof getGeometryError(geometry), null, `${name} is invalid`);
    const result = repairGeometry(geometry);
    assert.equal(result.changed, true, name);
    assert.equal(getGeometryError(result.geometry), null, `${name} is repaired`);
    assert.equal(countPolygons(result.geometry), polygons, name);
  }
});

test('drops what has no area', () => {
  assert.deepEqual(repairGeometry(polygon([[p(0, 0), p(1, 0), p(2, 0), p(0, 0)]])), {
    geometry: null,
    changed: true,
  });
  assert.deepEqual(repairGeometry(polygon([[p(0, 0), p(1, 0), p(0, 0)]])), {
    geometry: null,
    changed: true,
  });
});

test('cuts holes away when holes are not allowed', () => {
  const geometry = polygon([
    [p(0, 0), p(3, 0), p(3, 3), p(0, 3), p(0, 0)],
    [p(1, 1), p(1, 2), p(2, 2), p(2, 1), p(1, 1)],
  ]);
  assert.equal(repairGeometry(geometry).changed, false);
  const result = repairGeometry(geometry, { allowHoles: false });
  assert.equal(result.changed, true);
  assert.equal(result.geometry?.type, 'MultiPolygon');
  for (const part of /** @type {import('geojson').MultiPolygon} */ (result.geometry).coordinates) {
    assert.equal(part.length, 1);
    assert.equal(getGeometryError({ type: 'Polygon', coordinates: part }), null);
  }
});

test('repairs random scribbles', () => {
  let seed = 1;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 300; ++i) {
    const ring = [];
    const count = 4 + Math.floor(random() * 20);
    for (let j = 0; j < count; ++j) {
      ring.push(p(Math.round(random() * 6) / 2, Math.round(random() * 6) / 2));
    }
    ring.push(ring[0]);
    const { geometry } = repairGeometry(polygon([ring]));
    assert.equal(getGeometryError(geometry), null, JSON.stringify(ring));
  }
});
