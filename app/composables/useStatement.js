/** @typedef {Ref<{quantity: Quantity, geojson: import('geojson').FeatureCollection, speciesList: Array<string>|null}|null>} Snapshot */

/**
 * @typedef UseStatement
 * @property {Ref<Quantity>} quantity
 * @property {Ref<import('geojson').FeatureCollection>} geojson
 * @property {Ref<Array<string>|null>} speciesList
 * @property {Snapshot} snapshot
 * @property {Ref<boolean>} modifiedSinceSnapshot
 * @property {() => void} createSnapshot
 * @property {() => void} restoreSnapshot
 * @property {() => void} clear
 */

/**
 * @typedef {Partial<Record<import('~/utils/constants').HSCode, number>>} Quantity
 */

/**
 * @param {Snapshot} snapshot
 * @param {Ref<Quantity>} quantity
 * @param {Ref<import('geojson').FeatureCollection>} geojson
 * @param {Ref<Array<string>|null>} speciesList
 * @param {Ref<boolean>} modifiedSinceSnapshot
 */
function createSnapshot(snapshot, quantity, geojson, speciesList, modifiedSinceSnapshot) {
  snapshot.value = {
    quantity: structuredClone(toRaw(quantity.value)),
    geojson: structuredClone(geojson.value),
    speciesList: speciesList.value ? structuredClone(toRaw(speciesList.value)) : null,
  };
  modifiedSinceSnapshot.value = false;
}

/**
 * @param {Snapshot} snapshot
 * @param {Ref<Quantity>} quantity
 * @param {Ref<import('geojson').FeatureCollection>} geojson
 * @param {Ref<Array<string>|null>} speciesList
 * @param {Ref<boolean>} modifiedSinceSnapshot
 */
function restoreSnapshot(snapshot, quantity, geojson, speciesList, modifiedSinceSnapshot) {
  if (snapshot.value) {
    quantity.value = snapshot.value.quantity;
    geojson.value = snapshot.value.geojson;
    speciesList.value = snapshot.value.speciesList;
  }
  snapshot.value = null;
  modifiedSinceSnapshot.value = false;
}

/**
 * @param {import('~/utils/constants').Commodity} commodity
 * @param {Ref<Quantity>} quantity
 * @param {Ref<import('geojson').FeatureCollection>} geojson
 * @param {Ref<Array<string>|null>} speciesList
 */
function clear(commodity, quantity, geojson, speciesList) {
  quantity.value = {};
  geojson.value = structuredClone(EMPTY_GEOJSON);
  speciesList.value = commodity === 'holz' ? [] : null;
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

  /** @type {import('vue').Ref<Array<string>|null>} */
  const speciesList = useState(`speciesList-${commodity}`, () =>
    commodity === 'holz' ? [] : null,
  );

  const modifiedSinceSnapshot = useState(`modifiedSinceSnapshot-${commodity}`, () => false);
  watch([quantity, geojson, speciesList], () => {
    modifiedSinceSnapshot.value = true;
  });

  /** @type {Snapshot} */
  let snapshot = useState(`snapshot-${commodity}`, () => null);

  return {
    geojson,
    quantity,
    speciesList,
    snapshot,
    modifiedSinceSnapshot,
    createSnapshot: () =>
      createSnapshot(snapshot, quantity, geojson, speciesList, modifiedSinceSnapshot),
    restoreSnapshot: () =>
      restoreSnapshot(snapshot, quantity, geojson, speciesList, modifiedSinceSnapshot),
    clear: () => clear(commodity, quantity, geojson, speciesList),
  };
}
