const INDEX_URL = 'https://assets.w3geo.at/agraratlas/map/tiles/invekos_schlaege_polygon.index.bin';

/** Floor for how long the index is considered fresh, in case a response is ever
 * missing a parseable `Cache-Control: max-age` (this CDN always sends one today). */
const MIN_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * @typedef {Object} SchlaegeIndex
 * @property {Uint32Array} ids Schlag localIds, sorted ascending.
 * @property {Float32Array} extents `[minX, minY, maxX, maxY]` (EPSG:4326) per id, four
 *   entries per index position, same order as `ids`.
 */

/** @type {SchlaegeIndex|undefined} */
let index;
/** @type {string|undefined} */
let indexEtag;
let indexLoadedAt = 0;
let indexMaxAgeMs = MIN_MAX_AGE_MS;
/** @type {Promise<SchlaegeIndex>|undefined} */
let indexPromise;

/**
 * @param {string|null} cacheControl
 * @returns {number} The parsed `max-age` in ms, clamped to `MIN_MAX_AGE_MS`, or
 *   `MIN_MAX_AGE_MS` itself if `cacheControl` has no parseable `max-age`.
 */
function resolveMaxAgeMs(cacheControl) {
  const match = cacheControl?.match(/max-age=(\d+)/);
  const maxAgeMs = match ? Number(match[1]) * 1000 : undefined;
  return Math.max(maxAgeMs ?? MIN_MAX_AGE_MS, MIN_MAX_AGE_MS);
}

/**
 * Wraps a response body in typed-array views directly over the buffer — no
 * parsing, no copying.
 * @param {Response} response
 * @returns {Promise<SchlaegeIndex>}
 */
async function parseIndex(response) {
  const buffer = await response.arrayBuffer();
  const count = new Uint32Array(buffer, 0, 1)[0] ?? 0;
  const ids = new Uint32Array(buffer, 4, count);
  const extents = new Float32Array(buffer, 4 + count * 4, count * 4);
  return { ids, extents };
}

/**
 * Downloads a fresh copy of the ~58 MB invekos_schlaege spatial index
 * (localId -> extent), a little-endian binary blob of `[count: uint32,
 * localIds: uint32[count] sorted ascending, bboxes: float32[count * 4]]`.
 * @returns {Promise<{ data: SchlaegeIndex, etag: string|undefined, maxAgeMs: number }>}
 */
async function fetchFullIndex() {
  const response = await fetch(INDEX_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch schlaege index: ${response.status} ${response.statusText}`);
  }
  const etag = response.headers.get('etag') ?? undefined;
  const maxAgeMs = resolveMaxAgeMs(response.headers.get('cache-control'));
  const data = await parseIndex(response);
  return { data, etag, maxAgeMs };
}

/**
 * Loads the index for the first time, or revalidates the cached one against
 * `INDEX_URL` using `If-None-Match`, so an unchanged file costs a cheap 304
 * instead of a fresh ~58 MB download. Falls back to serving the stale index
 * (if any) when a revalidation attempt itself fails.
 * @returns {Promise<SchlaegeIndex>}
 */
async function refreshIndex() {
  if (!index || !indexEtag) {
    const full = await fetchFullIndex();
    index = full.data;
    indexEtag = full.etag;
    indexMaxAgeMs = full.maxAgeMs;
    indexLoadedAt = Date.now();
    return index;
  }

  try {
    const response = await fetch(INDEX_URL, { headers: { 'If-None-Match': indexEtag } });
    if (response.status === 304) {
      indexMaxAgeMs = resolveMaxAgeMs(response.headers.get('cache-control'));
      indexLoadedAt = Date.now();
      return index;
    }
    if (!response.ok) {
      indexLoadedAt = Date.now();
      return index;
    }
    index = await parseIndex(response);
    indexEtag = response.headers.get('etag') ?? undefined;
    indexMaxAgeMs = resolveMaxAgeMs(response.headers.get('cache-control'));
    indexLoadedAt = Date.now();
    return index;
  } catch {
    indexLoadedAt = Date.now();
    return index;
  }
}

/**
 * Returns the cached index, loading or revalidating it as needed per the
 * server's `Cache-Control: max-age` and `ETag`. Concurrent callers share the
 * same in-flight fetch.
 * @returns {Promise<SchlaegeIndex>}
 */
function getIndex() {
  if (index && Date.now() - indexLoadedAt < indexMaxAgeMs) {
    return Promise.resolve(index);
  }
  if (!indexPromise) {
    indexPromise = refreshIndex().finally(() => {
      indexPromise = undefined;
    });
  }
  return indexPromise;
}

/**
 * @param {Uint32Array} ids Sorted ascending.
 * @param {number} id
 * @returns {number} Index of `id` in `ids`, or -1 if not found.
 */
function binarySearch(ids, id) {
  let lo = 0;
  let hi = ids.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const value = ids[mid];
    if (value === undefined) {
      return -1;
    }
    if (value === id) {
      return mid;
    }
    if (value < id) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return -1;
}

/**
 * Combines the extents of the given schlag localIds into a single bounding
 * box, using the cached spatial index (never re-downloaded per call).
 * @param {Array<string|number>} localIds
 * @returns {Promise<[number, number, number, number]|null>} `[minX, minY, maxX, maxY]`
 *   in EPSG:4326, or `null` if `localIds` is empty or none were found.
 */
export async function getExtentForLocalIds(localIds) {
  if (!localIds.length) {
    return null;
  }
  const { ids, extents } = await getIndex();

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;
  for (const localId of localIds) {
    const i = binarySearch(ids, Number(localId));
    if (i === -1) {
      continue;
    }
    const o = i * 4;
    const x0 = extents[o];
    const y0 = extents[o + 1];
    const x1 = extents[o + 2];
    const y1 = extents[o + 3];
    if (x0 === undefined || y0 === undefined || x1 === undefined || y1 === undefined) {
      continue;
    }
    found = true;
    if (x0 < minX) minX = x0;
    if (y0 < minY) minY = y0;
    if (x1 > maxX) maxX = x1;
    if (y1 > maxY) maxY = y1;
  }
  return found ? [minX, minY, maxX, maxY] : null;
}

/**
 * Kicks off (or reuses) the index load without waiting for it, so the first
 * real request doesn't have to pay for the download.
 */
export function warmSchlaegeIndex() {
  getIndex().catch(() => {});
}
