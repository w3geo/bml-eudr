/**
 * @typedef UseStatement
 * @property {Ref<Quantity>} quantity
 * @property {Ref<import('geojson').FeatureCollection>} geojson
 * @property {Ref<{quantity: Quantity, geojson: import('geojson').FeatureCollection}|null>} snapshot
 * @property {Ref<boolean>} modifiedSinceSnapshot
 * @property {() => void} createSnapshot
 * @property {() => void} restoreSnapshot
 * @property {() => void} clear
 */

/**
 * @typedef {Partial<Record<import('~/utils/constants').HSCode, number>>} Quantity
 */

/**
 * @param {Ref<{quantity: Quantity, geojson: import('geojson').FeatureCollection}|null>} snapshot
 * @param {Ref<Quantity>} quantity
 * @param {Ref<import('geojson').FeatureCollection>} geojson
 * @param {Ref<boolean>} modifiedSinceSnapshot
 */
function createSnapshot(snapshot, quantity, geojson, modifiedSinceSnapshot) {
  snapshot.value = {
    quantity: structuredClone(toRaw(quantity.value)),
    geojson: structuredClone(geojson.value),
  };
  modifiedSinceSnapshot.value = false;
}

/**
 * @param {Ref<{quantity: Quantity, geojson: import('geojson').FeatureCollection}|null>} snapshot
 * @param {Ref<Quantity>} quantity
 * @param {Ref<import('geojson').FeatureCollection>} geojson
 * @param {Ref<boolean>} modifiedSinceSnapshot
 */
function restoreSnapshot(snapshot, quantity, geojson, modifiedSinceSnapshot) {
  if (snapshot.value) {
    quantity.value = snapshot.value.quantity;
    geojson.value = snapshot.value.geojson;
  }
  snapshot.value = null;
  modifiedSinceSnapshot.value = false;
}

/**
 * @param {Ref<Quantity>} quantity
 * @param {Ref<import('geojson').FeatureCollection>} geojson
 */
function clear(quantity, geojson) {
  quantity.value = {};
  geojson.value = structuredClone(EMPTY_GEOJSON);
}

/**
 * @param {import('~/utils/constants').Commodity} commodity
 * @returns {UseStatement}
 */
export function useStatement(commodity) {
  /** @type {import('vue').Ref<import('ol/format/GeoJSON').GeoJSONFeatureCollection>} */
  const geojson = useState(`geojson-${commodity}`, () =>
    shallowRef(structuredClone(EMPTY_GEOJSON)),
  );

  /** @type {import('vue').Ref<Quantity>} */
  const quantity = useState(`quantity-${commodity}`, () => /** @type {Quantity} */ ({}));

  const modifiedSinceSnapshot = useState(`modifiedSinceSnapshot-${commodity}`, () => false);
  watch([quantity, geojson], () => {
    modifiedSinceSnapshot.value = true;
  });

  /** @type {Ref<{quantity: Quantity, geojson: import('geojson').FeatureCollection}|null>} */
  let snapshot = useState(`snapshot-${commodity}`, () => null);

  return {
    geojson,
    quantity,
    snapshot,
    modifiedSinceSnapshot,
    createSnapshot: () => createSnapshot(snapshot, quantity, geojson, modifiedSinceSnapshot),
    restoreSnapshot: () => restoreSnapshot(snapshot, quantity, geojson, modifiedSinceSnapshot),
    clear: () => clear(quantity, geojson),
  };
}
