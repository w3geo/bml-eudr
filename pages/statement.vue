<script setup>
import { mdiCheck, mdiClose, mdiPlus, mdiSprout } from '@mdi/js';
import equal from 'fast-deep-equal';

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

/** @type {import('vue').Ref<null|import('~/utils/constants').EditCommodity>} */
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
 * @param {import('~/utils/constants.js').EditCommodity} commodity
 */
function save(commodity) {
  map.value = false;
  const { quantity, geojson } = useStatement(commodity);
  items.value[commodity] = {
    quantity: quantity.value,
    geojson: structuredClone(geojson.value),
  };
}

/**
 * @param {import('~/utils/constants.js').EditCommodity} commodity
 */
function confirmAbandon(commodity) {
  const { quantity, geojson } = useStatement(commodity);
  const currentQuantity = items.value[commodity]?.quantity || 0;
  const currentGeojson = structuredClone(items.value[commodity]?.geojson || EMPTY_GEOJSON);
  if (quantity.value === currentQuantity || equal(geojson.value, currentGeojson)) {
    map.value = false;
    return;
  }
  confirm.value = true;
}
</script>

<template>
  <v-dialog v-model="confirm" max-width="400">
    <v-card>
      <v-card-text>Änderungen werden nicht gespeichert. Möchten Sie fortfahren?</v-card-text>
      <v-card-actions>
        <v-btn @click="confirm = false">Nein</v-btn>
        <v-btn
          @click="
            confirm = false;
            map = false;
          "
          >Ja</v-btn
        >
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
            ><v-btn color="primary" :prepend-icon="mdiPlus" @click="editCommodity = key"
              >Hinzufügen</v-btn
            ></v-card-actions
          >
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
