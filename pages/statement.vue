<script setup>
import {
  mdiCheck,
  mdiCheckDecagram,
  mdiClose,
  mdiEmailFastOutline,
  mdiMessageTextOutline,
} from '@mdi/js';
import { FetchError } from 'ofetch';

/**
 * @typedef {Object} CommodityData
 * @property {import('~/composables/useStatement').Quantity} quantity
 * @property {import('geojson').FeatureCollection} geojson
 */

/** @typedef {CommodityData & {key: import('~/utils/constants.js').Commodity}} CommodityDataWithKey */

definePageMeta({
  middleware: ['authenticated-only'],
  title: 'Sorgfaltspflichterklärung',
  sort: 20,
});

const { mdAndUp, xs } = useDisplay();
const { data: userData } = await useFetch('/api/users/me');

const statementTokenUrl =
  userData.value?.loginProvider === 'OTP'
    ? `${useRequestURL().origin}/statement?onBehalfOf=${userData.value?.email}&token=${userData.value?.statementToken}`
    : undefined;

/** @type {import('vue').Ref<import('~/components/UserData.vue').default|null>} */
const userDataForm = ref(null);

/** @type {import('vue').Ref<boolean>} */
const geolocationVisible = ref(false);

/** @type {import('vue').Ref<null|import('~/utils/constants').Commodity>} */
const editCommodity = ref(null);

/** @type {import('vue').Ref<string|null>} */
const submitError = ref(null);
const displaySubmitError = computed({
  get: () => !!submitError.value,
  set: (value) => {
    if (!value) {
      submitError.value = null;
    }
  },
});

const map = computed({
  get: () => !!editCommodity.value,
  set: (value) => {
    if (!value) {
      editCommodity.value = null;
    }
  },
});

/** @type {import('vue').Ref<Record<import('~/utils/constants.js').Commodity, CommodityData>>} */
const items = ref(
  COMMODITY_KEYS.reduce((items, key) => {
    const { quantity, geojson } = useStatement(key);
    items[key] = {
      quantity: quantity.value,
      geojson: structuredClone(geojson.value),
    };
    return items;
  }, /** @type {Record<import('~/utils/constants.js').Commodity, CommodityData>} */ ({})),
);

/** @type {import('vue').Ref<boolean>} */
const confirm = ref(false);

/** @type {import('vue').ComputedRef<Array<CommodityDataWithKey>>} */
const commoditiesInStatement = computed(() =>
  COMMODITY_KEYS.map((key) => ({ key, ...items.value[key] })).filter(
    (commodity) => commodity.geojson.features.length,
  ),
);

/** @type {import('vue').ComputedRef<Array<CommodityDataWithKey>>} */
const commoditiesToAdd = computed(() =>
  COMMODITY_KEYS.map((key) => ({ key, ...items.value[key] })).filter(
    (commodity) => !commodity.geojson.features.length,
  ),
);

const canSend = computed(() =>
  Object.values(items.value).some((item) => item.geojson.features.length),
);

/**
 * @param {import('~/utils/constants.js').Commodity} commodity
 */
function savePlaces(commodity) {
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
  if (!(await userDataForm.value?.validate())) {
    return;
  }
  await userDataForm.value?.save();
  try {
    await $fetch('/api/statements', {
      method: 'POST',
      body: JSON.stringify({
        commodities: items.value,
        geolocationVisible: geolocationVisible.value,
      }),
    });
    useRouter().push('/account');
  } catch (error) {
    if (error instanceof FetchError) {
      submitError.value = error.data.message;
    } else if (error instanceof Error) {
      submitError.value = error.message;
    }
  } finally {
    for (const key of COMMODITY_KEYS) {
      useStatement(key).clear();
    }
  }
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
          <v-card-text v-if="canSend"
            ><UserData ref="userDataForm" />
            <v-row>
              <v-col
                v-for="item in commoditiesInStatement"
                :key="item.key"
                :cols="mdAndUp ? 4 : xs ? 12 : 6"
              >
                <CommodityCard :item="item" @open-editor="openEditor" />
              </v-col>
            </v-row>
            <v-checkbox
              v-model="geolocationVisible"
              class="mt-4 checkbox-align-start"
              hide-details
              density="compact"
            >
              <template #label>
                <div class="ml-1 text-body-2">
                  Erzeugungsorte in anderen Sorgfaltspflichterklärungen anzeigen, wenn sie sich auf
                  diese beziehen
                </div>
              </template>
            </v-checkbox>
            <p class="mt-4">
              Durch Übermittlung dieser Sorgfaltserklärung bestätigt der Marktteilnehmer, dass er
              die Sorgfaltspflicht gemäß der Verordnung (EU) 2023/1115 erfüllt hat, und dass kein
              oder lediglich ein vernachlässigbares Risiko dahin gehend festgestellt wurde, dass die
              relevanten Erzeugnisse gegen Artikel 3 Buchstaben a oder b dieser Verordnung
              verstoßen.
            </p>
          </v-card-text>
          <v-card-actions v-if="canSend">
            <v-btn :prepend-icon="mdiCheckDecagram" color="primary" @click="submit"
              >Übermitteln</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-col>
      <template v-if="userData?.loginProvider !== 'OTP'">
        <v-col v-for="item in commoditiesToAdd" :key="item.key" :cols="mdAndUp ? 4 : xs ? 12 : 6">
          <CommodityCard :item="item" @open-editor="openEditor" />
        </v-col>
      </template>
      <template v-else>
        <v-col cols="12">
          <v-card>
            <v-card-title>Jemand anders beauftragen</v-card-title>
            <v-card-text>
              Sie können jetzt einen Link zur Erstellung einer Sorgfaltspflichterklärung
              verschicken.
              <b>Bitte beachten Sie:</b> Nur Personen, die über ein eAMA oder ID Austria Login
              verfügen, können Sorgfaltspflichterklärungen erstellen.
            </v-card-text>
            <v-card-actions>
              <v-btn
                v-card-actions
                text="E-Mail"
                :prepend-icon="mdiEmailFastOutline"
                color="primary"
                :href="`mailto:?subject=EUDR Sorgfaltspflichterklärung für ${userData.email}&body=Bitte erstellen Sie eine EUDR Sorgfaltspflichterklärung für ${userData.email}: ${statementTokenUrl}`"
              ></v-btn>
              <v-btn
                text="SMS"
                :prepend-icon="mdiMessageTextOutline"
                color="primary"
                :href="`sms:?body=Bitte erstellen Sie für ${userData.email} eine EUDR Sorgfaltspflichterklärung: ${statementTokenUrl}`"
              ></v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </template>
    </v-row>
    <v-snackbar v-model="displaySubmitError" timeout="6000">{{ submitError }}</v-snackbar>
  </v-container>
</template>

<style scoped>
.fill-width {
  width: 100%;
}
</style>
