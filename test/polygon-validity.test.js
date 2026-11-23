import { test } from 'node:test';
import assert from 'node:assert/strict';
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

test('accepts what TRACES accepts', () => {
  /** @type {Record<string, import('geojson').Geometry>} */
  const valid = {
    'control': polygon([square]),
    'clockwise': polygon([[...square].reverse()]),
    'duplicate-vertex': polygon([[p(0, 0), p(1, 0), p(1, 0), p(1, 1), p(0, 1), p(0, 0)]]),
    'sliver': polygon([[p(0, 0), p(0.014, 0), p(0.014, 0.009), p(0, 0.009), p(0, 0)]]),
    'hole': polygon([
      [p(0, 0), p(3, 0), p(3, 3), p(0, 3), p(0, 0)],
      [p(1, 1), p(1, 2), p(2, 2), p(2, 1), p(1, 1)],
    ]),
    'multi-disjoint': { type: 'MultiPolygon', coordinates: [[square], [squareAt(2, 0)]] },
    'multi-shared-edge': { type: 'MultiPolygon', coordinates: [[square], [squareAt(1, 0)]] },
    'multi-overlapping': { type: 'MultiPolygon', coordinates: [[square], [squareAt(0.5, 0)]] },
    'three-d': polygon([square.map(([x, y]) => [x, y, 300])]),
    'swapped-axes': polygon([square.map(([x, y]) => [y, x])]),
    'point': { type: 'Point', coordinates: p(0, 0) },
  };
  for (const [name, geometry] of Object.entries(valid)) {
    assert.equal(getGeometryError(geometry), null, name);
  }
});

test('rejects what TRACES rejects', () => {
  /** @type {Record<string, import('geojson').Geometry>} */
  const invalid = {
    'bowtie': polygon([[p(0, 0), p(1, 1), p(1, 0), p(0, 1), p(0, 0)]]),
    'self-touching': polygon([
      [p(0, 0), p(1, 0), p(1, 1), p(2, 1), p(2, 2), p(1, 2), p(1, 1), p(0, 1), p(0, 0)],
    ]),
    'near-touching': polygon([
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
    'unclosed': polygon([square.slice(0, 4)]),
    'too-few-positions': polygon([[p(0, 0), p(1, 0), p(0, 0)]]),
    'spike': polygon([
      [p(0, 0), p(1, 0), p(1, 0.5), p(2, 0.5), p(1, 0.5), p(1, 1), p(0, 1), p(0, 0)],
    ]),
    'collinear': polygon([[p(0, 0), p(1, 0), p(2, 0), p(0, 0)]]),
    'hole-outside': polygon([square, squareAt(3, 3).reverse()]),
    'invalid-part': {
      type: 'MultiPolygon',
      coordinates: [[squareAt(3, 0)], [[p(0, 0), p(1, 1), p(1, 0), p(0, 1), p(0, 0)]]],
    },
  };
  for (const [name, geometry] of Object.entries(invalid)) {
    assert.equal(typeof getGeometryError(geometry), 'string', name);
  }
});

test('rejects spikes and vertices on edges at the ring start', () => {
  assert.equal(
    typeof getGeometryError(
      polygon([[p(2, 0.5), p(1, 0.5), p(1, 1), p(0, 1), p(0, 0), p(1, 0), p(1, 0.5), p(2, 0.5)]]),
    ),
    'string',
  );
  assert.equal(
    typeof getGeometryError(polygon([[p(0, 0), p(2, 0), p(2, 2), p(1, 0), p(0, 2), p(0, 0)]])),
    'string',
  );
});

test('rejects holes crossing the shell or inside other holes', () => {
  const shell = [p(0, 0), p(4, 0), p(4, 4), p(0, 4), p(0, 0)];
  assert.equal(
    typeof getGeometryError(polygon([shell, [p(3, 1), p(5, 1), p(5, 2), p(3, 2), p(3, 1)]])),
    'string',
  );
  assert.equal(
    typeof getGeometryError(
      polygon([
        shell,
        [p(1, 1), p(3, 1), p(3, 3), p(1, 3), p(1, 1)],
        [p(1.5, 1.5), p(2.5, 1.5), p(2.5, 2.5), p(1.5, 2.5), p(1.5, 1.5)],
      ]),
    ),
    'string',
  );
});

test('handles large rings', () => {
  const ring = [];
  for (let i = 0; i < 20000; ++i) {
    const angle = (2 * Math.PI * i) / 20000;
    ring.push([+(X + 0.01 * Math.cos(angle)).toFixed(6), +(Y + 0.01 * Math.sin(angle)).toFixed(6)]);
  }
  ring.push(ring[0]);
  const start = performance.now();
  assert.equal(getGeometryError(polygon([ring])), null);
  assert.ok(performance.now() - start < 1000);
});
