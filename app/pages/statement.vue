<script setup>
import {
  mdiAccountEdit,
  mdiCheck,
  mdiCheckDecagram,
  mdiClose,
  mdiHelpCircleOutline,
} from '@mdi/js';
import { FetchError } from 'ofetch';

definePageMeta({
  middleware: ['authenticated-only'],
  title: 'Vereinfachte Erklärung',
  sort: 20,
});

const { mdAndUp, xs } = useDisplay();
const { start, finish, clear } = useLoadingIndicator();
const { errorMessage } = useErrorMessage();
/** @type {import('vue').Ref<import('~/components/UserData.vue').default|null>} */
const userDataComplete = ref(null);

const { data: user, refresh: refetchUserData } = await useFetch('/api/users/me');
const incomplete = computed(() => {
  return !(
    user.value?.name &&
    user.value?.address &&
    user.value?.identifierType &&
    user.value?.identifierValue
  );
});

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
const confirm = ref(false);

const isAma = computed(() => user.value?.loginProvider === 'AMA');
/**
 * Per-commodity statement state, created once here rather than by re-invoking
 * `useStatement()` inside computeds and handlers. The composable registers a
 * change watcher on every call, so calling it per render/evaluation accumulated
 * watchers and triggered recursive update loops.
 */
const statements =
  /** @type {Record<import('~~/shared/utils/constants').Commodity, ReturnType<typeof useStatement>>} */ (
    Object.fromEntries(COMMODITY_KEYS.map((key) => [key, useStatement(key, isAma.value)]))
  );

/**
 * Whether the map editor is shown for the commodity currently being edited:
 * true when "Geolokalisation" is selected, false for "Postanschrift". Mirrors the
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
  // Pre-fill the producer address with the user's own address so the commodity
  // always carries a complete address; the postal form lets the user override
  // it. The snapshot taken right after captures the pre-fill as the editing
  // baseline, so opening the editor is not treated as an unsaved change.
  if (!address.value) {
    address.value = parseAddress(user.value?.address || '') ?? {
      street: '',
      postalCode: '',
      city: '',
    };
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
  if (!(await userDataSubmit.value?.validate())) {
    return;
  }
  await userDataSubmit.value?.save();
  try {
    start();
    await $fetch('/api/statements', {
      method: 'POST',
      body: JSON.stringify({
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
    useRouter().push('/account');
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
  // In "Postanschrift" mode the postal fields are required; block until they are
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

  <v-dialog v-model="map" fullscreen>
    <v-card v-if="editCommodity" class="h-100">
      <v-toolbar>
        <v-btn :icon="mdiClose" @click="exitPlaces(editCommodity)"></v-btn>

        <v-app-bar-title>{{ COMMODITIES[editCommodity].title }}</v-app-bar-title>

        <v-btn :icon="mdiCheck" :commodity="editCommodity" @click="validate"></v-btn>
      </v-toolbar>
      <places-form ref="placesFormRef" :commodity="editCommodity" :is-ama="isAma" />
      <places-map
        v-if="showMapEditor"
        style="flex: 1 1 0; min-height: 0"
        :commodity="editCommodity"
        :address="user?.address || undefined"
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
          <v-card-title>Vereinfachte Erklärung</v-card-title>
          <v-card-text v-if="canSend">
            <UserData ref="userDataSubmit" />
            <v-row>
              <v-col
                v-for="item in commoditiesInStatement"
                :key="item.key"
                :cols="mdAndUp ? 4 : xs ? 12 : 6"
              >
                <CommodityCard :item="item" @open-editor="openEditor" />
              </v-col>
            </v-row>
            <v-checkbox v-model="geolocationVisible" class="mt-4" hide-details density="compact">
              <template #label>
                <div class="ml-1 text-body-2">Einsicht in die Erzeugungsorte erlauben</div>
                <v-tooltip max-width="400" open-on-click>
                  <template #activator="{ props }">
                    <v-btn flat :icon="mdiHelpCircleOutline" size="x-small" v-bind="props"></v-btn>
                  </template>
                  <div>
                    Wenn aktiviert, können alle, die die Referenz- und Verifizierungsnummer dieser
                    Erklärung kennen, die Erzeugungsorte im EU-Informationssystem einsehen. Das sind
                    üblicherweise Ihre Abnehmer; diese können die Nummern jedoch weitergeben. Wenn
                    nicht aktiviert, werden die Erzeugungsorte als vertraulich behandelt und nicht
                    weitergegeben. Auf die übrigen Angaben der Erklärung und auf die Einsicht durch
                    die Behörden hat diese Einstellung keinen Einfluss.
                  </div>
                </v-tooltip>
              </template>
            </v-checkbox>
            <div class="text-body-1 mt-4">
              Hiermit beauftrage ich das Bundesministerium für Land- und Forstwirtschaft, Klima- und
              Umweltschutz, Regionen und Wasserwirtschaft (BMLUK), für mich als Bevollmächtiger im
              Sinne von Artikel 2 Ziffer 22 der Verordnung (EU) 2023/1115 aufzutreten und die von
              mir erstellte Vereinfachte Erklärung an das Informationssystem gemäß Artikel 33 dieser
              Verordnung zu übermitteln. Ich bestätige, die alleinige Verantwortung für den Inhalt
              der Vereinfachten Erklärung zu übernehmen.
            </div>
            <div class="text-body-1 mt-4">
              Durch Übermittlung dieser Vereinfachten Erklärung bestätige ich, die Sorgfaltspflicht
              gemäß der Verordnung (EU) 2023/1115 durchgeführt zu haben, und dass kein oder
              lediglich ein vernachlässigbares Risiko dahingehend festgestellt wurde, dass die
              relevanten Erzeugnisse gegen Artikel 3 Buchstaben a oder b dieser Verordnung
              verstoßen.
            </div>
          </v-card-text>
          <v-card-actions v-if="canSend">
            <v-btn :prepend-icon="mdiCheckDecagram" color="primary" @click="submit">
              Bestätigen und übermitteln
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <template v-if="!incomplete">
        <v-col v-for="item in commoditiesToAdd" :key="item.key" :cols="mdAndUp ? 4 : xs ? 12 : 6">
          <CommodityCard :item="item" @open-editor="openEditor" />
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
