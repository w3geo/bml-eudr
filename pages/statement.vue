<script setup>
import { mdiCheck, mdiCheckDecagram, mdiClose, mdiNoteEdit, mdiPlus } from '@mdi/js';

/**
 * @typedef {Object} CommodityData
 * @property {number} quantity
 * @property {import('geojson').FeatureCollection} geojson
 * @property {string} summary
 */

definePageMeta({
  middleware: ['authenticated-only'],
  title: 'Sorgfaltspflichterklärung',
  sort: 20,
});

const { mdAndUp, xs } = useDisplay();

/** @type {import('vue').Ref<import('~/components/UserData.vue').default|null>} */
const userData = ref(null);

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
const items = ref(
  /** @type {Array<import('~/utils/constants.js').Commodity>} */ (Object.keys(COMMODITIES)).reduce(
    (items, key) => {
      const { quantity, geojson, summary } = useStatement(key);
      items[key] = {
        quantity: quantity.value,
        geojson: structuredClone(geojson.value),
        summary: summary.value,
      };
      return items;
    },
    /** @type {Object<string, CommodityData>} */ ({}),
  ),
);

/** @type {import('vue').Ref<boolean>} */
const confirm = ref(false);

const commodities = computed(() =>
  /** @type {Array<import('~/utils/constants.js').Commodity>} */ (Object.keys(items.value))
    .map((key) => ({ key, ...items.value[key] }))
    .sort((a, b) => (a.summary && !b.summary ? -1 : !a.summary && !b.summary ? 0 : 1)),
);

const canSend = computed(() => Object.values(items.value).some((item) => item.summary));

/**
 * @param {import('~/utils/constants.js').Commodity} commodity
 */
function savePlaces(commodity) {
  map.value = false;
  const { quantity, geojson, summary } = useStatement(commodity);
  items.value[commodity] = {
    quantity: quantity.value,
    geojson: structuredClone(geojson.value),
    summary: summary.value,
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
function exitPlaces(commodity) {
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

async function submit() {
  if (!(await userData.value?.validate())) {
    return;
  }
  await userData.value?.save();
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
        <v-btn :icon="mdiClose" @click="exitPlaces(editCommodity)"></v-btn>

        <v-app-bar-title>{{ COMMODITIES[editCommodity].title }}</v-app-bar-title>

        <v-btn :icon="mdiCheck" @click="savePlaces(editCommodity)"></v-btn>
      </v-toolbar>
      <places-form :commodity="editCommodity" @submit="savePlaces(editCommodity)" />
      <places-map :commodity="editCommodity" />
    </v-card>
  </v-dialog>

  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>Sorgfaltspflichterklärung</v-card-title>
          <v-card-text v-if="canSend"><UserData ref="userData" /></v-card-text>
          <v-card-actions v-if="canSend">
            <v-btn :prepend-icon="mdiCheckDecagram" color="primary" @click="submit"
              >Abschicken</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col v-for="item in commodities" :key="item.key" :cols="mdAndUp ? 4 : xs ? 12 : 6">
        <v-card
          :color="item.summary ? 'teal-darken-4' : ''"
          class="d-flex flex-column align-center justify-center"
          min-height="180"
        >
          <v-card-title>{{ COMMODITIES[item.key].title }}</v-card-title>
          <v-card-text class="d-flex flex-column align-center justify-center pb-0"
            ><v-icon :icon="COMMODITIES[item.key].icon" size="50" />
            <div>{{ item.summary }}</div></v-card-text
          >
          <v-card-actions
            ><v-btn
              v-if="!item.summary"
              color="primary"
              :prepend-icon="mdiPlus"
              @click="openEditor(item.key)"
              >Hinzufügen</v-btn
            ><v-btn v-else color="primary" :prepend-icon="mdiNoteEdit" @click="openEditor(item.key)"
              >Bearbeiten</v-btn
            ></v-card-actions
          >
        </v-card>
      </v-col>
    </v-row>
    &nbsp;
  </v-container>
</template>
