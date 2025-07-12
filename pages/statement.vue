<script setup>
import {
  mdiAccountEdit,
  mdiCheck,
  mdiCheckDecagram,
  mdiClose,
  mdiEmailFastOutline,
  mdiMessageTextOutline,
  mdiQrcode,
} from '@mdi/js';
import { FetchError } from 'ofetch';

/**
 * @typedef {Object} CommodityData
 * @property {import('~/composables/useStatement').Quantity|import('vue').Ref<import('~/composables/useStatement').Quantity>} quantity
 * @property {import('geojson').FeatureCollection|import('vue').Ref<import('geojson').FeatureCollection>} geojson
 */

/** @typedef {CommodityData & {key: import('~/utils/constants.js').Commodity}} CommodityDataWithKey */

definePageMeta({
  middleware: ['authenticated-only'],
  title: 'Sorgfaltspflichterklärung',
  sort: 20,
});

const { query } = useRoute();
const { mdAndUp, xs } = useDisplay();
/** @type {import('vue').Ref<import('~/components/UserData.vue').default|null>} */
const userDataComplete = ref(null);

/** @type {import('vue').Ref<import('~/server/db/schema/users.js').User|null>|null} */
let onBehalfOfUser = null;
if (typeof query.onBehalfOf === 'string' && typeof query.token === 'string') {
  const onBehalfQueryParams = new URLSearchParams();
  onBehalfQueryParams.set('onBehalfOf', query.onBehalfOf);
  onBehalfQueryParams.set('token', query.token);
  const { data } = await useFetch(`/api/users/onBehalfOf?${onBehalfQueryParams.toString()}`);
  onBehalfOfUser = data;
}
const { data: user, refresh: refetchUserData } = await useFetch('/api/users/me');
const incomplete = computed(() => {
  if (user.value?.loginProvider === 'OTP') {
    return !(
      user.value?.name &&
      user.value?.address &&
      user.value?.identifierType &&
      user.value?.identifierValue
    );
  } else if (user.value?.loginProvider === 'IDA') {
    return !(user.value?.identifierType && user.value?.identifierValue);
  }
  return false;
});

const statementTokenUrl =
  user.value?.loginProvider === 'OTP'
    ? `${useRequestURL().origin}/statement?onBehalfOf=${user.value?.email}&token=${user.value?.statementToken}`
    : undefined;

/** @type {import('vue').Ref<import('~/components/UserData.vue').default|null>} */
const userDataSubmit = ref(null);

/** @type {import('vue').Ref<boolean>} */
const geolocationVisible = ref(false);

/** @type {import('vue').Ref<null|import('~/utils/constants').Commodity>} */
const editCommodity = ref(null);

/** @type {import('vue').Ref<boolean>} */
const savedOnBehalfOf = ref(false);

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

/** @type {import('vue').Ref<boolean>} */
const confirm = ref(false);

/** @type {import('vue').ComputedRef<Array<CommodityDataWithKey>>} */
const commoditiesInStatement = computed(() =>
  COMMODITY_KEYS.map((key) => ({ key, ...useStatement(key) })).filter(
    (commodity) => commodity.geojson.value.features.length,
  ),
);

/** @type {import('vue').ComputedRef<Array<CommodityDataWithKey>>} */
const commoditiesToAdd = computed(() =>
  COMMODITY_KEYS.map((key) => ({ key, ...useStatement(key) })).filter(
    (commodity) => !commodity.geojson.value.features.length,
  ),
);

const canSend = computed(() =>
  COMMODITY_KEYS.some((key) => useStatement(key).geojson.value.features.length),
);

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

async function completeUserData() {
  if (!(await userDataComplete.value?.validate())) {
    return;
  }
  await userDataComplete.value?.save();
  await refetchUserData();
}

async function submit() {
  if (!onBehalfOfUser?.value) {
    if (!(await userDataSubmit.value?.validate())) {
      return;
    }
    await userDataSubmit.value?.save();
  }
  try {
    await $fetch('/api/statements', {
      method: 'POST',
      body: JSON.stringify({
        onBehalfOf: onBehalfOfUser?.value ? onBehalfOfUser.value.id : undefined,
        token: onBehalfOfUser?.value ? onBehalfOfUser.value.statementToken : undefined,
        commodities: COMMODITY_KEYS.map((key) => ({
          key,
          quantity: useStatement(key).quantity.value,
          geojson: useStatement(key).geojson.value,
        })).filter((commodity) => commodity.geojson.features.length),
        geolocationVisible: geolocationVisible.value,
      }),
    });
    if (onBehalfOfUser?.value) {
      savedOnBehalfOf.value = true;
      const unwatch = watch(savedOnBehalfOf, (value) => {
        if (value === false) {
          unwatch();
          useRouter().push('/');
        }
      });
    } else {
      useRouter().push('/account');
    }
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

        <v-btn :icon="mdiCheck" @click="map = false"></v-btn>
      </v-toolbar>
      <places-form :commodity="editCommodity" @submit="map = false" />
      <places-map
        :commodity="editCommodity"
        :address="(onBehalfOfUser ? onBehalfOfUser.address : user?.address) || undefined"
      />
    </v-card>
  </v-dialog>

  <v-dialog v-model="savedOnBehalfOf" max-width="400">
    <v-card>
      <v-card-text
        >Die Sorgfaltserklärung für {{ onBehalfOfUser?.name }} wurde übermittelt. Sie können nun
        wieder Sorgfaltspflichterklärungen für sich selbst erstellen.</v-card-text
      >
      <v-card-actions>
        <v-btn @click="savedOnBehalfOf = false">Verstanden</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card v-if="incomplete">
          <v-card-title>Sorgfaltspflichterklärung</v-card-title>
          <v-card-text class="text-body-1 mb-6">
            <v-alert color="primary" :icon="mdiAccountEdit">
              Vervollständigen Sie bitte Ihr Profil, um fortzufahren:
            </v-alert>
          </v-card-text>
          <v-card-text>
            <UserData ref="userDataComplete" verbose />
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="completeUserData">Speichern</v-btn>
          </v-card-actions>
        </v-card>
        <v-card v-if="!incomplete">
          <v-card-title
            >Sorgfaltspflichterklärung{{
              onBehalfOfUser ? ' für ' + onBehalfOfUser.name : ''
            }}</v-card-title
          >
          <v-card-text v-if="canSend">
            <UserData v-if="!onBehalfOfUser" ref="userDataSubmit" />
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
      <template v-if="!incomplete && user?.loginProvider !== 'OTP'">
        <v-col v-for="item in commoditiesToAdd" :key="item.key" :cols="mdAndUp ? 4 : xs ? 12 : 6">
          <CommodityCard :item="item" @open-editor="openEditor" />
        </v-col>
      </template>
      <template v-if="!incomplete && user?.loginProvider === 'OTP'">
        <v-col cols="12">
          <v-card>
            <v-card-title>Jemand anders beauftragen</v-card-title>
            <v-card-text>
              Sie können jetzt einen Link zur Erstellung einer Sorgfaltspflichterklärung
              verschicken.
              <b>Bitte beachten Sie:</b> Nur Personen, die über ein eAMA oder ID Austria Login
              verfügen, können Sorgfaltspflichterklärungen erstellen.<br /><br />
              Mit der Weitergabe des Links per E-Mail, SMS oder QR-Code erklärt sich der
              Marktteilnehmer damit einverstanden, dass die Sorgfaltspflichterklärung zwar von einer
              anderen Person erstellt wird, die Verantwortung für die Richtigkeit der Angaben aber
              weiterhin beim Marktteilnehmer liegt.
            </v-card-text>
            <v-card-actions>
              <v-btn
                v-card-actions
                text="E-Mail"
                :prepend-icon="mdiEmailFastOutline"
                color="primary"
                :href="`mailto:?subject=EUDR Sorgfaltspflichterklärung für ${user.name}&body=${encodeURIComponent(`Bitte erstellen Sie eine EUDR Sorgfaltspflichterklärung für ${user.name}: ${statementTokenUrl}`)}`"
              ></v-btn>
              <v-btn
                text="SMS"
                :prepend-icon="mdiMessageTextOutline"
                color="primary"
                :href="`sms:?body=${encodeURIComponent(`Bitte erstellen Sie für ${user.name} eine EUDR Sorgfaltspflichterklärung: ${statementTokenUrl}`)}`"
              ></v-btn>
              <qr-code-button
                :prepend-icon="mdiQrcode"
                color="primary"
                :payload="statementTokenUrl"
              ></qr-code-button>
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
