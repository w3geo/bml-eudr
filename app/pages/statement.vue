<script setup>
import {
  mdiAccountEdit,
  mdiCheck,
  mdiCheckDecagram,
  mdiClose,
  mdiEmailFastOutline,
  mdiHelpCircleOutline,
  mdiMessageTextOutline,
} from '@mdi/js';
import { FetchError } from 'ofetch';
import useOnBehalfOf from '~/composables/useOnBehalfOf';

definePageMeta({
  middleware: ['authenticated-only'],
  title: 'Vereinfachte Erklärung',
  sort: 20,
});

const { query } = useRoute();
const { mdAndUp, xs } = useDisplay();
const { start, finish, clear } = useLoadingIndicator();
const { errorMessage } = useErrorMessage();
/** @type {import('vue').Ref<import('~/components/UserData.vue').default|null>} */
const userDataComplete = ref(null);

const { user: onBehalfOfUser, reset: resetOnBehalfOf } = useOnBehalfOf(
  query.onBehalfOf,
  query.token,
);

const { data: user, refresh: refetchUserData } = await useFetch('/api/users/me');
const incomplete = computed(() => {
  return !(
    user.value?.name &&
    user.value?.address &&
    user.value?.identifierType &&
    user.value?.identifierValue
  );
});

const statementTokenUrl =
  user.value?.loginProvider === 'OTP'
    ? `${useRequestURL().origin}/statement?onBehalfOf=${user.value?.id}&token=${user.value?.statementToken}`
    : '';

/** @type {import('vue').Ref<import('~/components/UserData.vue').default|null>} */
const userDataSubmit = ref(null);

/** @type {import('vue').Ref<boolean>} */
const geolocationVisible = ref(true);

/** @type {import('vue').Ref<null|import('~~/shared/utils/constants').Commodity>} */
const editCommodity = ref(null);

/**
 * Template ref to the <places-form> instance. Named `placesFormRef` rather than
 * `placesForm` on purpose: a `placesForm` binding would shadow the auto-imported
 * `PlacesForm` component in the template (the compiler resolves `<places-form>`
 * to the camelCased setup binding), making the component render as `null`.
 * @type {import('vue').Ref<import('~/components/PlacesForm.vue').default|null>}
 */
const placesFormRef = ref(null);

/** @type {import('vue').Ref<boolean>} */
const savedOnBehalfOf = ref(false);

/** @type {import('vue').Ref<boolean>} */
const confirm = ref(false);

/**
 * Per-commodity statement state, created once here rather than by re-invoking
 * `useStatement()` inside computeds and handlers. The composable registers a
 * change watcher on every call, so calling it per render/evaluation accumulated
 * watchers and triggered recursive update loops.
 */
const statements =
  /** @type {Record<import('~~/shared/utils/constants').Commodity, ReturnType<typeof useStatement>>} */ (
    Object.fromEntries(COMMODITY_KEYS.map((key) => [key, useStatement(key)]))
  );

/**
 * Whether the map editor is shown for the commodity currently being edited:
 * true when "Geolokalisation" is selected, false for "Postadresse". Mirrors the
 * commodity's persisted `geolocation` flag, which the dropdown in PlacesForm
 * writes directly.
 * @type {import('vue').ComputedRef<boolean>}
 */
const showMapEditor = computed(() =>
  editCommodity.value ? statements[editCommodity.value].geolocation.value : false,
);

/** @type {import('vue').WritableComputedRef<boolean>} */
const map = computed({
  get: () => !!editCommodity.value,
  set: (value) => {
    if (!value) {
      editCommodity.value = null;
    }
  },
});

/** @type {ComputedRef<Array<import('~~/server/utils/soap-traces.js').CommodityDataWithKey>>} */
const commoditiesInStatement = computed(() =>
  COMMODITY_KEYS.map((key) => ({ key, ...statements[key] })).filter((commodity) =>
    Object.values(commodity.quantity.value).some((v) => v > 0),
  ),
);

/** @type {ComputedRef<Array<import('~~/server/utils/soap-traces.js').CommodityDataWithKey>>} */
const commoditiesToAdd = computed(() =>
  COMMODITY_KEYS.map((key) => ({ key, ...statements[key] })).filter(
    (commodity) => !Object.values(commodity.quantity.value).some((v) => v > 0),
  ),
);

const canSend = computed(() =>
  COMMODITY_KEYS.some((key) => Object.values(statements[key].quantity.value).some((v) => v > 0)),
);

/**
 * @param {import('~~/shared/utils/constants.js').Commodity} commodity
 */
function openEditor(commodity) {
  if (commodity === 'rind' && user.value?.loginProvider !== 'AMA') {
    errorMessage.value =
      'RinderNET Verknüpfung erforderlich - Die Erfassung von Rindern ist nur mit einem eAMA Login möglich. Bitte melden Sie sich mit Ihrem eAMA Account an, um Rinder zu erfassen.';
    return;
  }
  editCommodity.value = commodity;
  const { address, createSnapshot } = statements[commodity];
  // Pre-fill the producer address with the (on-behalf-of) user's address so the
  // commodity always carries a complete address; the postal form lets the user
  // override it. The snapshot taken right after captures the pre-fill as the
  // editing baseline, so opening the editor is not treated as an unsaved change.
  if (!address.value) {
    address.value = parseAddress(
      (onBehalfOfUser?.value ? onBehalfOfUser.value.address : user.value?.address) || '',
    ) ?? { street: '', postalCode: '', city: '' };
  }
  createSnapshot();
}

/**
 * @param {import('~~/shared/utils/constants.js').Commodity} commodity
 */
function exitPlaces(commodity) {
  const { modifiedSinceSnapshot } = statements[commodity];
  if (!modifiedSinceSnapshot.value) {
    map.value = false;
    return;
  }
  confirm.value = true;
}

/**
 * @param {import('~~/shared/utils/constants.js').Commodity} commodity
 */
function abandonChanges(commodity) {
  const { restoreSnapshot } = statements[commodity];
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
    await $fetch('/api/statements', {
      method: 'POST',
      body: JSON.stringify({
        onBehalfOf: onBehalfOfUser?.value ? onBehalfOfUser.value.id : undefined,
        token: onBehalfOfUser?.value ? onBehalfOfUser.value.statementToken : undefined,
        commodities: COMMODITY_KEYS.map((key) => ({
          key,
          quantity: statements[key].quantity.value,
          geojson: statements[key].geojson.value,
          address: statements[key].address.value,
          geolocation: statements[key].geolocation.value,
        })).filter((commodity) => Object.values(commodity.quantity).some((v) => v > 0)),
        geolocationVisible: geolocationVisible.value,
      }),
    });
    await new Promise((r) => setTimeout(r, 1000));
    for (const key of COMMODITY_KEYS) {
      statements[key].clear();
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
      errorMessage.value = error.data.message;
    } else if (error instanceof Error) {
      errorMessage.value = error.message;
    }
  } finally {
    finish();
    clear();
  }
}

async function validate() {
  if (!editCommodity.value) {
    return true;
  }
  const { quantity } = statements[editCommodity.value];
  let sum = 0;
  for (const q of /** @type {Array<keyof typeof quantity.value>} */ (Object.keys(quantity.value))) {
    sum += quantity.value?.[q] || 0;
  }
  if (sum === 0) {
    errorMessage.value =
      'Zumindest für ein(en) Rohstoff/Erzeugnis muss eine Menge angegeben werden.';
    return;
  }
  // In "Postadresse" mode the postal fields are required; block until they are
  // complete. (In "Geolokalisation" mode those fields are not rendered, so the
  // form validates as valid.)
  if (placesFormRef.value && !(await placesFormRef.value.validate())) {
    return;
  }
  map.value = false;
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

  <v-dialog v-model="savedOnBehalfOf" max-width="400">
    <v-card>
      <v-card-text>
        Die Vereinfachte Erklärung für {{ onBehalfOfUser?.name }} wurde übermittelt. Sie können nun
        wieder Vereinfachte Erklärungen für sich selbst erstellen.
      </v-card-text>
      <v-card-actions>
        <v-btn @click="savedOnBehalfOf = false"> Ok </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="map" fullscreen>
    <v-card v-if="editCommodity" class="h-100">
      <v-toolbar>
        <v-btn :icon="mdiClose" @click="exitPlaces(editCommodity)"></v-btn>

        <v-app-bar-title>{{ COMMODITIES[editCommodity].title }}</v-app-bar-title>

        <v-btn :icon="mdiCheck" :commodity="editCommodity" @click="validate"></v-btn>
      </v-toolbar>
      <places-form ref="placesFormRef" :commodity="editCommodity" />
      <places-map
        v-if="showMapEditor"
        style="flex: 1 1 0; min-height: 0"
        :commodity="editCommodity"
        :address="(onBehalfOfUser ? onBehalfOfUser.address : user?.address) || undefined"
      />
    </v-card>
  </v-dialog>

  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card v-if="incomplete">
          <v-card-title>Vereinfachte Erklärung</v-card-title>
          <v-card-text class="text-body-1">
            <v-alert color="primary" :icon="mdiAccountEdit">
              Vervollständigen Sie bitte Ihr Profil, um fortzufahren.
            </v-alert>
          </v-card-text>
          <v-card-text>
            <UserData ref="userDataComplete" editable />
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="completeUserData"> Speichern </v-btn>
          </v-card-actions>
        </v-card>
        <v-card v-if="!incomplete">
          <v-card-title>
            Vereinfachte Erklärung{{ onBehalfOfUser ? ' für ' + onBehalfOfUser.name : '' }}
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
                <div class="ml-1 text-body-2">
                  Erzeugungsorte für nachfolgende Marktteilnehmer freigeben
                </div>
                <v-tooltip max-width="400" open-on-click>
                  <template #activator="{ props }">
                    <v-btn flat :icon="mdiHelpCircleOutline" size="x-small" v-bind="props"></v-btn>
                  </template>
                  <div>
                    Wenn aktiviert, sind die Erzeugungsorte für nachfolgende Marktteilnehmer
                    sichtbar. Wenn nicht aktiviert, werden die Erzeugungsorte als vertraulich
                    behandelt, sind jedoch auch von Ihnen selbst nicht mehr einsehbar.
                  </div>
                </v-tooltip>
              </template>
            </v-checkbox>
            <div class="text-body-1 mt-4">
              Hiermit beauftrag{{ onBehalfOfUser ? 't ' + onBehalfOfUser.name : 'e ich' }} das
              Bundesministerium für Land- und Forstwirtschaft, Klima- und Umweltschutz, Regionen und
              Wasserwirtschaft (BMLUK), für {{ onBehalfOfUser ? onBehalfOfUser.name : 'mich' }} als
              Bevollmächtiger im Sinne von Artikel 2 Ziffer 22 der Verordnung (EU) 2023/1115
              aufzutreten und die
              {{ onBehalfOfUser ? 'für ' + onBehalfOfUser.name : 'von mir' }} erstellte Vereinfachte
              Erklärung an das Informationssystem gemäß Artikel 33 dieser Verordnung zu übermitteln.
              {{ onBehalfOfUser ? onBehalfOfUser.name + ' bestätigt' : 'Ich bestätige' }}, die
              alleinige Verantwortung für den Inhalt der Vereinfachten Erklärung zu übernehmen.
            </div>
            <div class="text-body-1 mt-4">
              Durch Übermittlung dieser Vereinfachten Erklärung bestätig{{
                onBehalfOfUser ? 't ' + onBehalfOfUser.name : 'e ich'
              }}, die Sorgfaltspflicht gemäß der Verordnung (EU) 2023/1115 durchgeführt zu haben,
              und dass kein oder lediglich ein vernachlässigbares Risiko dahingehend festgestellt
              wurde, dass die relevanten Erzeugnisse gegen Artikel 3 Buchstaben a oder b dieser
              Verordnung verstoßen.
            </div>
            <div v-if="onBehalfOfUser" class="text-body-1 mt-4">
              Ich stimme zu, dass Name und Adresse meines Betriebes gespeichert werden, um mich als
              Ersteller dieser Vereinfachten Erklärung für {{ onBehalfOfUser.name }} zuordnen zu
              können.
            </div>
          </v-card-text>
          <v-card-actions v-if="canSend">
            <v-btn :prepend-icon="mdiCheckDecagram" color="primary" @click="submit">
              Bestätigen und übermitteln
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
              <div class="text-body-1 mb-2">
                Sie können jetzt einen Link zur Erstellung einer Vereinfachten Erklärung
                verschicken.
                <b>Bitte beachten Sie:</b> Nur Personen, die über ein eAMA oder ID Austria Login
                verfügen, können Vereinfachte Erklärungen erstellen.
              </div>
              <div class="text-body-1 mb-2">
                Mit der Weitergabe des Links per E-Mail, SMS oder QR-Code nehme ich zur Kenntnis,
                dass die volle Verantwortung für die Richtigkeit der Angaben einer von einer anderen
                Person für mich erstellten Vereinfachten Erklärung bei mir liegt. Weiters nehme ich
                zur Kenntnis, dass die interne TRACES Datenbank ID der Vereinfachten Erklärung
                gespeichert wird, um diese dem Ersteller zuordnen zu können.
              </div>
            </v-card-text>
            <v-card-actions>
              <v-btn
                text="E-Mail"
                :prepend-icon="mdiEmailFastOutline"
                color="primary"
                :href="`mailto:?subject=EUDR Vereinfachte Erklärung für ${user.name}&body=${encodeURIComponent(`Bitte erstellen Sie eine EUDR Vereinfachte Erklärung für ${user.name}: ${statementTokenUrl}`)}`"
              ></v-btn>
              <v-btn
                text="SMS"
                :prepend-icon="mdiMessageTextOutline"
                color="primary"
                :href="`sms:?body=${encodeURIComponent(`Bitte erstellen Sie für ${user.name} eine EUDR Vereinfachte Erklärung: ${statementTokenUrl}`)}`"
              ></v-btn>
              <qr-code-button color="primary" :payload="statementTokenUrl"></qr-code-button>
            </v-card-actions>
          </v-card>
        </v-col>
      </template>
    </v-row>
  </v-container>
</template>

<style scoped>
.fill-width {
  width: 100%;
}
</style>
