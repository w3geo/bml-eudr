/** @typedef {[number, number]} Point */
/** @typedef {{ring: number, index: number, a: Point, b: Point, minX: number, maxX: number, minY: number, maxY: number}} Segment */

// Integer products of coordinate differences within one polygon stay below
// Number.MAX_SAFE_INTEGER, so orientation tests are exact.
const SCALE = 1e6;

/**
 * @param {Point} a
 * @param {Point} b
 * @param {Point} c
 * @returns {number}
 */
function orientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

/**
 * @param {Point} a
 * @param {Point} b
 * @param {Point} c
 * @returns {boolean}
 */
function inBox(a, b, c) {
  return (
    Math.min(a[0], b[0]) <= c[0] &&
    c[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= c[1] &&
    c[1] <= Math.max(a[1], b[1])
  );
}

/**
 * @param {Point} a
 * @param {Point} b
 * @param {Point} c
 * @param {Point} d
 * @returns {boolean}
 */
function intersects(a, b, c, d) {
  const o1 = Math.sign(orientation(a, b, c));
  const o2 = Math.sign(orientation(a, b, d));
  const o3 = Math.sign(orientation(c, d, a));
  const o4 = Math.sign(orientation(c, d, b));
  if (o1 !== o2 && o3 !== o4) {
    return true;
  }
  return (
    (o1 === 0 && inBox(a, b, c)) ||
    (o2 === 0 && inBox(a, b, d)) ||
    (o3 === 0 && inBox(c, d, a)) ||
    (o4 === 0 && inBox(c, d, b))
  );
}

/**
 * @param {Point} a
 * @param {Point} b
 * @param {Point} c
 * @returns {boolean}
 */
function backtracks(a, b, c) {
  if (orientation(a, b, c) !== 0) {
    return false;
  }
  return (a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]) > 0;
}

/**
 * @param {import('geojson').Position[]} ring
 * @returns {Point[] | string}
 */
function normalizeRing(ring) {
  if (ring.length < 2) {
    return 'Die Fläche hat zu wenige Eckpunkte.';
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    return 'Die Fläche ist nicht geschlossen.';
  }
  /** @type {Point[]} */
  const points = [];
  for (const position of ring) {
    const point = /** @type {Point} */ ([
      Math.round(Number(position[0]) * SCALE),
      Math.round(Number(position[1]) * SCALE),
    ]);
    const previous = points[points.length - 1];
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) {
      points.push(point);
    }
  }
  if (points.length < 4) {
    return 'Die Fläche hat zu wenige Eckpunkte.';
  }
  return points;
}

/**
 * @param {Point[]} ring
 * @returns {number}
 */
function doubleArea(ring) {
  let sum = 0;
  const [ox, oy] = /** @type {Point} */ (ring[0]);
  for (let i = 1, ii = ring.length - 2; i < ii; ++i) {
    const [x1, y1] = /** @type {Point} */ (ring[i]);
    const [x2, y2] = /** @type {Point} */ (ring[i + 1]);
    sum += (x1 - ox) * (y2 - oy) - (x2 - ox) * (y1 - oy);
  }
  return sum;
}

/**
 * @param {Point} point
 * @param {Point[]} ring
 * @returns {boolean}
 */
function isInside(point, ring) {
  let inside = false;
  const [x, y] = point;
  for (let i = 0, ii = ring.length - 1; i < ii; ++i) {
    const [x1, y1] = /** @type {Point} */ (ring[i]);
    const [x2, y2] = /** @type {Point} */ (ring[i + 1]);
    if (y1 > y !== y2 > y && x < x1 + ((y - y1) * (x2 - x1)) / (y2 - y1)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * @param {import('geojson').Position[][]} coordinates
 * @returns {string | null}
 */
export function getPolygonError(coordinates) {
  /** @type {Point[][]} */
  const rings = [];
  for (const ring of coordinates) {
    const normalized = normalizeRing(ring);
    if (typeof normalized === 'string') {
      return normalized;
    }
    if (doubleArea(normalized) === 0) {
      return 'Die Fläche hat keinen Flächeninhalt.';
    }
    rings.push(normalized);
  }
  if (rings.length === 0) {
    return 'Die Fläche hat zu wenige Eckpunkte.';
  }

  /** @type {Segment[]} */
  const segments = [];
  rings.forEach((ring, r) => {
    for (let i = 0, ii = ring.length - 1; i < ii; ++i) {
      const a = /** @type {Point} */ (ring[i]);
      const b = /** @type {Point} */ (ring[i + 1]);
      segments.push({
        ring: r,
        index: i,
        a,
        b,
        minX: Math.min(a[0], b[0]),
        maxX: Math.max(a[0], b[0]),
        minY: Math.min(a[1], b[1]),
        maxY: Math.max(a[1], b[1]),
      });
    }
  });

  segments.sort((s1, s2) => s1.minX - s2.minX);
  for (let i = 0, ii = segments.length; i < ii; ++i) {
    const s1 = /** @type {Segment} */ (segments[i]);
    for (let j = i + 1; j < ii; ++j) {
      const s2 = /** @type {Segment} */ (segments[j]);
      if (s2.minX > s1.maxX) {
        break;
      }
      if (s2.minY > s1.maxY || s2.maxY < s1.minY) {
        continue;
      }
      if (s1.ring !== s2.ring) {
        if (intersects(s1.a, s1.b, s2.a, s2.b)) {
          return 'Ein Loch der Fläche berührt oder schneidet deren Rand.';
        }
        continue;
      }
      const count = /** @type {Point[]} */ (rings[s1.ring]).length - 1;
      const [first, second] = s1.index < s2.index ? [s1, s2] : [s2, s1];
      if (second.index === first.index + 1) {
        if (backtracks(first.a, first.b, second.b)) {
          return 'Der Rand der Fläche läuft auf sich selbst zurück.';
        }
      } else if (first.index === 0 && second.index === count - 1) {
        if (backtracks(second.a, second.b, first.b)) {
          return 'Der Rand der Fläche läuft auf sich selbst zurück.';
        }
      } else if (intersects(s1.a, s1.b, s2.a, s2.b)) {
        return 'Der Rand der Fläche berührt oder schneidet sich selbst.';
      }
    }
  }

  // Rings do not touch each other here, so testing one position per hole is enough.
  const [shell, ...holes] = rings;
  for (let h = 0; h < holes.length; ++h) {
    const point = /** @type {Point} */ (/** @type {Point[]} */ (holes[h])[0]);
    if (!isInside(point, /** @type {Point[]} */ (shell))) {
      return 'Ein Loch liegt außerhalb der Fläche.';
    }
    if (holes.some((other, o) => o !== h && isInside(point, other))) {
      return 'Ein Loch liegt innerhalb eines anderen Lochs.';
    }
  }
  return null;
}

/**
 * @param {import('geojson').Geometry | null | undefined} geometry
 * @returns {string | null}
 */
export function getGeometryError(geometry) {
  if (geometry?.type === 'Polygon') {
    return getPolygonError(geometry.coordinates);
  }
  if (geometry?.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      const error = getPolygonError(polygon);
      if (error) {
        return error;
      }
    }
  }
  return null;
}
