<script setup>
import {
  mdiAccountEdit,
  mdiCheck,
  mdiCheckDecagram,
  mdiClose,
  mdiEmailFastOutline,
  mdiHelpCircleOutline,
  mdiMessageTextOutline,
  mdiQrcode,
} from '@mdi/js';
import { FetchError } from 'ofetch';
import useOnBehalfOf from '~/composables/useOnBehalfOf';

/**
 * @typedef {Object} CommodityData
 * @property {import('~/composables/useStatement').Quantity|import('vue').Ref<import('~/composables/useStatement').Quantity>} quantity
 * @property {import('geojson').FeatureCollection|import('vue').Ref<import('geojson').FeatureCollection>} geojson
 */

/** @typedef {CommodityData & {key: import('~/utils/constants.js').Commodity}} CommodityDataWithKey */

definePageMeta({
  middleware: ['authenticated-only'],
  title: 'Sorgfaltserklärung',
  sort: 20,
});

const { query } = useRoute();
const { mdAndUp, xs } = useDisplay();
const { start, finish, clear } = useLoadingIndicator();
/** @type {import('vue').Ref<import('~/components/UserData.vue').default|null>} */
const userDataComplete = ref(null);
const amaOnlyDialog = ref(false);

const { user: onBehalfOfUser, reset: resetOnBehalfOf } = useOnBehalfOf(
  query.onBehalfOf,
  query.token,
);

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
const geolocationVisible = ref(true);

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
  if (commodity === 'rind' && user.value?.loginProvider !== 'AMA') {
    amaOnlyDialog.value = true;
    return;
  }
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
    start();
    await useFetch('/api/statements', {
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
    await new Promise((r) => setTimeout(r, 1000));
    for (const key of COMMODITY_KEYS) {
      useStatement(key).clear();
    }
    if (onBehalfOfUser?.value) {
      savedOnBehalfOf.value = true;
      const unwatch = watch(savedOnBehalfOf, (value) => {
        if (value === false) {
          unwatch();
          resetOnBehalfOf();
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
    finish();
    clear();
  }
}
</script>

<template>
  <v-dialog v-model="confirm" max-width="400">
    <v-card v-if="editCommodity">
      <v-card-text>Änderungen werden nicht gespeichert. Möchten Sie fortfahren?</v-card-text>
      <v-card-actions>
        <v-btn @click="confirm = false"> Nein </v-btn>
        <v-btn @click="abandonChanges(editCommodity)"> Ja </v-btn>
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
      <v-card-text>
        Die Sorgfaltserklärung für {{ onBehalfOfUser?.name }} wurde übermittelt. Sie können nun
        wieder Sorgfaltserklärungen für sich selbst erstellen.
      </v-card-text>
      <v-card-actions>
        <v-btn @click="savedOnBehalfOf = false"> Verstanden </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="amaOnlyDialog" max-width="400">
    <v-card>
      <v-card-title class="ml-2 mr-2 mt-2">RinderNET Verknüpfung erforderlich</v-card-title>
      <v-card-text>
        Die Erfassung von Rindern ist nur mit einem eAMA Login möglich. Bitte melden Sie sich mit
        Ihrem eAMA Account an, um Rinder zu erfassen.
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="amaOnlyDialog = false"> Verstanden </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card v-if="incomplete">
          <v-card-title>Sorgfaltserklärung</v-card-title>
          <v-card-text class="text-body-1 mb-6">
            <v-alert color="primary" :icon="mdiAccountEdit">
              Vervollständigen Sie bitte Ihr Profil, um fortzufahren:
            </v-alert>
          </v-card-text>
          <v-card-text>
            <UserData ref="userDataComplete" verbose />
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="completeUserData"> Speichern </v-btn>
          </v-card-actions>
        </v-card>
        <v-card v-if="!incomplete">
          <v-card-title>
            Sorgfaltserklärung{{ onBehalfOfUser ? ' für ' + onBehalfOfUser.name : '' }}
          </v-card-title>
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
                <div class="ml-1 text-body-2">Zugriff auf Erzeugungsorte erlauben</div>
                <v-tooltip max-width="400" open-on-click>
                  <template #activator="{ props }">
                    <v-btn flat :icon="mdiHelpCircleOutline" size="x-small" v-bind="props"></v-btn>
                  </template>
                  <div>
                    Wenn ausgewählt (empfohlen), sind nach dem Abschicken die in der Karte
                    angegebenen Erzeugungsorte mit Referenz- und Verifikationsnummer abfragbar. Wenn
                    nicht, bleiben sie verborgen, und können auch nicht in künftige
                    Sorgfaltserklärungen des Marktteilnehmers selbst übernommen werden.
                  </div>
                </v-tooltip>
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
            <v-btn :prepend-icon="mdiCheckDecagram" color="primary" @click="submit">
              Übermitteln
            </v-btn>
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
              Sie können jetzt einen Link zur Erstellung einer Sorgfaltserklärung verschicken.
              <b>Bitte beachten Sie:</b> Nur Personen, die über ein eAMA oder ID Austria Login
              verfügen, können Sorgfaltserklärungen erstellen.<br /><br />
              Mit der Weitergabe des Links per E-Mail, SMS oder QR-Code erklärt sich der
              Marktteilnehmer damit einverstanden, dass die Sorgfaltserklärung zwar von einer
              anderen Person erstellt wird, die Verantwortung für die Richtigkeit der Angaben aber
              weiterhin beim Marktteilnehmer liegt.
            </v-card-text>
            <v-card-actions>
              <v-btn
                text="E-Mail"
                :prepend-icon="mdiEmailFastOutline"
                color="primary"
                :href="`mailto:?subject=EUDR Sorgfaltserklärung für ${user.name}&body=${encodeURIComponent(`Bitte erstellen Sie eine EUDR Sorgfaltserklärung für ${user.name}: ${statementTokenUrl}`)}`"
              ></v-btn>
              <v-btn
                text="SMS"
                :prepend-icon="mdiMessageTextOutline"
                color="primary"
                :href="`sms:?body=${encodeURIComponent(`Bitte erstellen Sie für ${user.name} eine EUDR Sorgfaltserklärung: ${statementTokenUrl}`)}`"
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
    <v-snackbar v-model="displaySubmitError" timeout="6000">
      {{ submitError }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.fill-width {
  width: 100%;
}
</style>
