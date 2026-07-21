/** @typedef {Ref<{quantity: Quantity, geojson: import('geojson').FeatureCollection, address: Address, geolocation: boolean}|null>} Snapshot */

/**
 * @typedef UseStatement
 * @property {Ref<Quantity>} quantity
 * @property {Ref<import('geojson').FeatureCollection>} geojson
 * @property {Ref<Address>} address
 * @property {Ref<boolean>} geolocation
 * @property {Snapshot} snapshot
 * @property {Ref<boolean>} modifiedSinceSnapshot
 * @property {() => void} createSnapshot
 * @property {() => void} restoreSnapshot
 * @property {() => void} clear
 */

/**
 * @typedef {Partial<Record<import('~~/shared/utils/constants').HSCode, number>>} Quantity
 */

/**
 * Postal address of the production place, submitted to TRACES when "Postadresse"
 * is selected as the production location (i.e. `geolocation` is false). `null`
 * means "use the logged in user's address".
 * @typedef {{ street: string, postalCode: string, city: string } | null} Address
 */

/**
 * Drop zero (and other falsy) quantities so that an absent HS heading and one
 * seeded to 0 compare equal. A 0 quantity means "not present" throughout the
 * app (the in-statement filters all test `v > 0`).
 * @param {Quantity} quantity
 * @returns {Quantity}
 */
function normalizeQuantity(quantity) {
  return /** @type {Quantity} */ (
    Object.fromEntries(Object.entries(quantity ?? {}).filter(([, v]) => v))
  );
}

/**
 * @param {Snapshot} snapshot
 * @param {Ref<Quantity>} quantity
 * @param {Ref<import('geojson').FeatureCollection>} geojson
 * @param {Ref<Address>} address
 * @param {Ref<boolean>} geolocation
 */
function createSnapshot(snapshot, quantity, geojson, address, geolocation) {
  snapshot.value = {
    quantity: structuredClone(toRaw(quantity.value)),
    geojson: structuredClone(geojson.value),
    address: structuredClone(toRaw(address.value)),
    geolocation: geolocation.value,
  };
}

/**
 * @param {Snapshot} snapshot
 * @param {Ref<Quantity>} quantity
 * @param {Ref<import('geojson').FeatureCollection>} geojson
 * @param {Ref<Address>} address
 * @param {Ref<boolean>} geolocation
 */
function restoreSnapshot(snapshot, quantity, geojson, address, geolocation) {
  if (snapshot.value) {
    quantity.value = snapshot.value.quantity;
    geojson.value = snapshot.value.geojson;
    address.value = snapshot.value.address;
    geolocation.value = snapshot.value.geolocation;
  }
  snapshot.value = null;
}

/**
 * @param {Ref<Quantity>} quantity
 * @param {Ref<import('geojson').FeatureCollection>} geojson
 * @param {Ref<Address>} address
 * @param {Ref<boolean>} geolocation
 */
function clear(quantity, geojson, address, geolocation) {
  quantity.value = {};
  geojson.value = structuredClone(EMPTY_GEOJSON);
  address.value = null;
  geolocation.value = false;
}

/**
 * @param {import('~~/shared/utils/constants').Commodity} commodity
 * @returns {UseStatement}
 */
export function useStatement(commodity) {
  /** @type {import('vue').Ref<import('ol/format/GeoJSON').GeoJSONFeatureCollection>} */
  const geojson = useState(`geojson-${commodity}`, () =>
    shallowRef(structuredClone(EMPTY_GEOJSON)),
  );

  /** @type {import('vue').Ref<Quantity>} */
  const quantity = useState(`quantity-${commodity}`, () => /** @type {Quantity} */ ({}));

  /** @type {import('vue').Ref<Address>} */
  const address = useState(`address-${commodity}`, () => null);

  /**
   * Whether the production location is given as a drawn geolocation
   * ("Geolokalisation", true) rather than a postal address ("Postadresse",
   * false). Governs which of the two is submitted to TRACES.
   * @type {import('vue').Ref<boolean>}
   */
  const geolocation = useState(`geolocation-${commodity}`, () => false);

  /** @type {Snapshot} */
  const snapshot = useState(`snapshot-${commodity}`, () => null);

  // Derive "modified" by comparing the current state against the snapshot rather
  // than flipping a flag from a watcher. A watcher would fire on the editor's
  // pre-fill (making merely opening the editor look like a change) and had to be
  // reset from createSnapshot, a fragile back-and-forth that fed update loops.
  const modifiedSinceSnapshot = computed(() => {
    const snap = snapshot.value;
    if (!snap) {
      return false;
    }
    return (
      geolocation.value !== snap.geolocation ||
      // Compare quantities with zeros stripped: PlacesForm seeds every HS heading
      // to 0 on mount (after the snapshot is taken), and a 0 quantity means "not
      // present" everywhere else, so absent and 0 must count as unchanged.
      JSON.stringify(normalizeQuantity(quantity.value)) !==
        JSON.stringify(normalizeQuantity(snap.quantity)) ||
      JSON.stringify(address.value) !== JSON.stringify(snap.address) ||
      JSON.stringify(geojson.value) !== JSON.stringify(snap.geojson)
    );
  });

  return {
    geojson,
    quantity,
    address,
    geolocation,
    snapshot,
    modifiedSinceSnapshot,
    createSnapshot: () => createSnapshot(snapshot, quantity, geojson, address, geolocation),
    restoreSnapshot: () => restoreSnapshot(snapshot, quantity, geojson, address, geolocation),
    clear: () => clear(quantity, geojson, address, geolocation),
  };
}
