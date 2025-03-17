<script setup>
import { mdiCheck, mdiClose, mdiPlus } from '@mdi/js';

/**
 * @typedef {Object} CommodityData
 * @property {number} quantity
 * @property {import('geojson').FeatureCollection} geojson
 */

definePageMeta({
  middleware: ['authenticated-only'],
  title: 'Sorgfaltspflichterklärung',
  sort: 20,
});

const { mdAndUp, xs } = useDisplay();

/** @type {import('vue').Ref<null|import('~/utils/constants').Commodity>} */
const editCommodity = ref(null);

const map = computed({
  get: () => !!editCommodity.value,
  set: (value) => {
    if (!value) {
      editCommodity.value = null;
    }
  },
});

/** @type {import('vue').Ref<Object<string, CommodityData>>} */
const items = ref({});

/** @type {import('vue').Ref<boolean>} */
const confirm = ref(false);

/**
 * @param {import('~/utils/constants.js').Commodity} commodity
 */
function save(commodity) {
  //FIXME do this the other way around - always save, and restore if user cancels
  // snapshot of geojson and quantity, to restore clear source and add features from snapshot geojson
  map.value = false;
  const { quantity, geojson } = useStatement(commodity);
  items.value[commodity] = {
    quantity: quantity.value,
    geojson: structuredClone(geojson.value),
  };
}

/**
 * @param {import('~/utils/constants.js').Commodity} commodity
 */
function openEditor(commodity) {
  editCommodity.value = commodity;
  const { createSnapshot } = useStatement(commodity);
  createSnapshot();
}

/**
 * @param {import('~/utils/constants.js').Commodity} commodity
 */
function confirmAbandon(commodity) {
  const { modifiedSinceSnapshot } = useStatement(commodity);
  if (!modifiedSinceSnapshot.value) {
    map.value = false;
    return;
  }
  confirm.value = true;
}

/**
 * @param {import('~/utils/constants.js').Commodity} commodity
 */
function abandonChanges(commodity) {
  const { restoreSnapshot } = useStatement(commodity);
  restoreSnapshot();
  map.value = false;
  confirm.value = false;
}
</script>

<template>
  <v-dialog v-model="confirm" max-width="400">
    <v-card v-if="editCommodity">
      <v-card-text>Änderungen werden nicht gespeichert. Möchten Sie fortfahren?</v-card-text>
      <v-card-actions>
        <v-btn @click="confirm = false">Nein</v-btn>
        <v-btn @click="abandonChanges(editCommodity)">Ja</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="map" fullscreen>
    <v-card v-if="editCommodity">
      <v-toolbar>
        <v-btn :icon="mdiClose" @click="confirmAbandon(editCommodity)"></v-btn>

        <v-app-bar-title>{{ COMMODITIES[editCommodity].title }}</v-app-bar-title>

        <v-btn :icon="mdiCheck" @click="save(editCommodity)"></v-btn>
      </v-toolbar>
      <places-form :commodity="editCommodity" @submit="save(editCommodity)" />
      <places-map :commodity="editCommodity" />
    </v-card>
  </v-dialog>

  <v-container>
    <v-row>
      <v-col v-for="(item, key) in COMMODITIES" :key="key" :cols="mdAndUp ? 4 : xs ? 12 : 6">
        <v-card>
          <v-card-title class="d-flex justify-center">{{ item.title }}</v-card-title>
          <v-card-text class="d-flex justify-center"
            ><v-icon :icon="item.icon" size="50"
          /></v-card-text>
          <v-card-actions class="d-flex justify-center"
            ><v-btn color="primary" :prepend-icon="mdiPlus" @click="openEditor(key)"
              >Hinzufügen</v-btn
            ></v-card-actions
          >
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
