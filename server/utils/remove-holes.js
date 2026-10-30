import polygonClipping from 'polygon-clipping';

/** @typedef {import('geojson').Position[][]} PolygonCoordinates */

/**
 * @param {import('geojson').Position[]} ring
 * @returns {[number, number, number, number]}
 */
function getExtent(ring) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of /** @type {Array<[number, number]>} */ (ring)) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Splits a polygon into polygons without holes. The polygon is cut horizontally at the center of
 * its first hole's extent, which turns that hole (and any other hole the cut crosses) into part of
 * the exterior rings of the pieces. Pieces that still have holes are split recursively.
 * @param {PolygonCoordinates} polygon
 * @returns {Array<PolygonCoordinates>}
 */
function splitAtHoles(polygon) {
  const [exterior, hole] = polygon;
  if (!exterior || !hole) {
    return [polygon];
  }
  const [minX, minY, maxX, maxY] = getExtent(exterior);
  const [, holeMinY, , holeMaxY] = getExtent(hole);
  const cutY = (holeMinY + holeMaxY) / 2;
  // Boxes extend beyond the polygon, so their edges do not coincide with the polygon's edges.
  const left = minX - 1;
  const right = maxX + 1;
  /** @type {import('polygon-clipping').Polygon} */
  const below = [
    [
      [left, minY - 1],
      [right, minY - 1],
      [right, cutY],
      [left, cutY],
      [left, minY - 1],
    ],
  ];
  /** @type {import('polygon-clipping').Polygon} */
  const above = [
    [
      [left, cutY],
      [right, cutY],
      [right, maxY + 1],
      [left, maxY + 1],
      [left, cutY],
    ],
  ];
  const geom = /** @type {import('polygon-clipping').Polygon} */ (polygon);
  return [
    ...polygonClipping.intersection(geom, below),
    ...polygonClipping.intersection(geom, above),
  ].flatMap((piece) => splitAtHoles(piece));
}

/**
 * Replaces polygons with holes by hole-free polygons covering the same area, because TRACES does
 * not accept interior rings. Each resulting polygon becomes a separate feature with the original
 * feature's properties, because polygons sharing an edge would make an invalid MultiPolygon.
 * @param {import('geojson').FeatureCollection<import('geojson').Geometry | null>} geojson
 * @returns {import('geojson').FeatureCollection<import('geojson').Geometry | null>}
 */
export function removeHoles(geojson) {
  return {
    ...geojson,
    features: geojson.features.flatMap((feature) => {
      const geometry = feature.geometry;
      /** @type {Array<PolygonCoordinates>} */
      let polygons;
      if (geometry?.type === 'Polygon') {
        polygons = [geometry.coordinates];
      } else if (geometry?.type === 'MultiPolygon') {
        polygons = geometry.coordinates;
      } else {
        return [feature];
      }
      if (polygons.every((polygon) => polygon.length < 2)) {
        return [feature];
      }
      return polygons.flatMap(splitAtHoles).map((coordinates) => ({
        ...feature,
        geometry: { type: 'Polygon', coordinates },
      }));
    }),
  };
}
