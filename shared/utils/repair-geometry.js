import polygonClipping from 'polygon-clipping';
import { getPolygonError } from './polygon-validity.js';
import { splitAtHoles } from './remove-holes.js';

/** @typedef {import('geojson').Position[][]} PolygonCoordinates */
/** @typedef {[number, number]} Point */

const SCALE = 1e6;
const MAX_ROUNDS = 5;
const SPLIT_HOLES_ROUND = 2;

/**
 * @param {PolygonCoordinates} polygon
 * @returns {Point[][]}
 */
function toIntegers(polygon) {
  return polygon.map((ring) =>
    ring.map(([x, y]) => [Math.round(Number(x) * SCALE), Math.round(Number(y) * SCALE)]),
  );
}

/**
 * @param {Point[][]} polygon
 * @returns {PolygonCoordinates}
 */
function toDegrees(polygon) {
  return polygon.map((ring) => ring.map(([x, y]) => [x / SCALE, y / SCALE]));
}

/**
 * @param {Point[]} ring
 * @returns {number}
 */
function doubleArea(ring) {
  let sum = 0;
  for (let i = 0, ii = ring.length - 1; i < ii; ++i) {
    const [x1, y1] = /** @type {Point} */ (ring[i]);
    const [x2, y2] = /** @type {Point} */ (ring[i + 1]);
    sum += x1 * y2 - x2 * y1;
  }
  return sum;
}

/**
 * @param {Point[]} ring
 * @returns {Point[][]}
 */
function splitRing(ring) {
  /** @type {Point[][]} */
  const loops = [];
  /** @type {Point[]} */
  const stack = [];
  /** @type {Map<string, number>} */
  const positions = new Map();
  for (const point of ring.slice(0, -1)) {
    const key = `${point[0]},${point[1]}`;
    const start = positions.get(key);
    if (start === undefined) {
      positions.set(key, stack.length);
      stack.push(point);
      continue;
    }
    const loop = stack.splice(start + 1);
    for (const removed of loop) {
      positions.delete(`${removed[0]},${removed[1]}`);
    }
    loops.push([point, ...loop, point]);
  }
  loops.push([...stack, /** @type {Point} */ (stack[0])]);
  return loops.filter((loop) => loop.length >= 4);
}

/**
 * @param {Point[][]} polygon
 * @returns {Array<Point[][]>}
 */
function splitTouchingRings(polygon) {
  // polygon-clipping winds shells counter-clockwise and holes clockwise.
  /** @type {Point[][]} */
  const shells = [];
  /** @type {Point[][]} */
  const holes = [];
  for (const ring of polygon) {
    for (const loop of splitRing(ring)) {
      const area = doubleArea(loop);
      if (area > 0) {
        shells.push(loop);
      } else if (area < 0) {
        holes.push(loop);
      }
    }
  }
  /** @type {Array<Point[][]>} */
  const polygons = shells.map((shell) => [shell]);
  for (const hole of holes) {
    // Shells do not overlap, so the smallest shell around the hole's extent is the one it is in.
    const [minX, minY, maxX, maxY] = getExtent(hole);
    /** @type {Point[][] | undefined} */
    let best = undefined;
    let bestArea = Infinity;
    for (const candidate of polygons) {
      const shell = /** @type {Point[]} */ (candidate[0]);
      const [sMinX, sMinY, sMaxX, sMaxY] = getExtent(shell);
      const area = doubleArea(shell);
      if (sMinX <= minX && sMinY <= minY && sMaxX >= maxX && sMaxY >= maxY && area < bestArea) {
        best = candidate;
        bestArea = area;
      }
    }
    best?.push(hole);
  }
  return polygons;
}

/**
 * @param {Point[]} ring
 * @returns {[number, number, number, number]}
 */
function getExtent(ring) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY];
}

/**
 * @param {Point[][]} polygon
 * @param {number} pass
 * @returns {Array<Point[][]>}
 */
function clip(polygon, pass) {
  const rings = polygon.filter((ring) => new Set(ring.map(([x, y]) => `${x},${y}`)).size >= 3);
  if (!rings[0] || rings[0] !== polygon[0]) {
    return [];
  }
  /** @type {Array<Point[][]>} */
  let pieces;
  try {
    pieces = /** @type {Array<Point[][]>} */ (polygonClipping.union(rings));
  } catch (error) {
    console.error('Could not repair polygon:', error);
    return [];
  }
  pieces = pieces
    .map((piece) =>
      piece.map((ring) =>
        ring.map(([x, y]) => /** @type {Point} */ ([Math.round(x), Math.round(y)])),
      ),
    )
    .flatMap(splitTouchingRings);
  if (pass >= SPLIT_HOLES_ROUND) {
    pieces = pieces.flatMap((piece) => /** @type {Array<Point[][]>} */ (splitAtHoles(piece)));
  }
  return pieces;
}

/**
 * @param {Point[][]} polygon
 * @param {boolean} allowHoles
 * @returns {boolean}
 */
function isValid(polygon, allowHoles) {
  return (allowHoles || polygon.length === 1) && !getPolygonError(toDegrees(polygon));
}

/**
 * @param {import('geojson').Geometry | null} geometry
 * @param {Object} [options]
 * @param {boolean} [options.allowHoles]
 * @returns {{geometry: import('geojson').Geometry | null, changed: boolean}}
 */
export function repairGeometry(geometry, { allowHoles = true } = {}) {
  /** @type {Array<PolygonCoordinates>} */
  let polygons;
  if (geometry?.type === 'Polygon') {
    polygons = [geometry.coordinates];
  } else if (geometry?.type === 'MultiPolygon') {
    polygons = geometry.coordinates;
  } else {
    return { geometry, changed: false };
  }
  const isPolygonValid = (/** @type {PolygonCoordinates} */ polygon) =>
    (allowHoles || polygon.length === 1) && !getPolygonError(polygon);
  if (polygons.every(isPolygonValid)) {
    return { geometry, changed: false };
  }

  /** @type {Array<PolygonCoordinates>} */
  const repaired = [];
  /** @type {Array<[Point[][], number]>} */
  const queue = [];
  for (const polygon of polygons) {
    if (isPolygonValid(polygon)) {
      repaired.push(polygon);
    } else {
      queue.push([toIntegers(polygon), 0]);
    }
  }
  while (queue.length) {
    const [polygon, rounds] = /** @type {[Point[][], number]} */ (queue.shift());
    if (rounds > 0 && isValid(polygon, allowHoles)) {
      repaired.push(toDegrees(polygon));
      continue;
    }
    if (rounds >= MAX_ROUNDS) {
      console.error('Could not repair polygon, dropping it');
      continue;
    }
    const pass = allowHoles ? rounds : Math.max(rounds, SPLIT_HOLES_ROUND);
    for (const piece of clip(polygon, pass)) {
      queue.push([piece, rounds + 1]);
    }
  }

  if (repaired.length === 0) {
    return { geometry: null, changed: true };
  }
  return {
    geometry:
      repaired.length === 1
        ? { type: 'Polygon', coordinates: /** @type {PolygonCoordinates} */ (repaired[0]) }
        : { type: 'MultiPolygon', coordinates: repaired },
    changed: true,
  };
}
