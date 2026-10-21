<script setup>
import {
  mdiAccountEdit,
  mdiCheck,
  mdiCheckDecagram,
  mdiClose,
  mdiDeleteOutline,
  mdiHelpCircleOutline,
  mdiPlus,
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
const incomplete = computed(() => !isUserDataValid(user.value));

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

/**
 * Commodity awaiting confirmation of its removal from the statement.
 * @type {import('vue').Ref<null|import('~~/shared/utils/constants').Commodity>}
 */
const removeCommodity = ref(null);
/**
 * Whether the commodity being edited was already in the statement when the editor was
 * opened, i.e. there is something to remove.
 */
const editCommodityInStatement = computed(
  () =>
    !!editCommodity.value &&
    Object.values(statements[editCommodity.value].snapshot.value?.quantity ?? {}).some(
      (v) => v > 0,
    ),
);

function confirmRemove() {
  if (!removeCommodity.value) {
    return;
  }
  statements[removeCommodity.value].clear();
  if (editCommodity.value === removeCommodity.value) {
    map.value = false;
  }
  removeCommodity.value = null;
}

const isAma = computed(() => user.value?.loginProvider === 'AMA');
/** Cattle are reported to AMA, so they need an LFBIS number: from eAMA, or from SMS login. */
const canSubmitCattle = computed(
  () =>
    isAma.value || (user.value?.loginProvider === 'SMS' && user.value?.identifierType === 'ONI'),
);
/**
 * Per-commodity statement state, created once here rather than by re-invoking
 * `useStatement()` inside computeds and handlers. The composable registers a
 * change watcher on every call, so calling it per render/evaluation accumulated
 * watchers and triggered recursive update loops.
 */
const statements =
  /** @type {Record<import('~~/shared/utils/constants').Commodity, ReturnType<typeof useStatement>>} */ (
    Object.fromEntries(
      COMMODITY_KEYS.map((key) => [key, useStatement(key, user.value?.loginProvider)]),
    )
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

/**
 * The confidentiality checkbox only concerns drawn geolocations, not postal
 * addresses, so it's only relevant while at least one commodity in the
 * statement actually uses "Geolokalisation".
 */
const hasGeolocationCommodity = computed(() =>
  commoditiesInStatement.value.some((commodity) => unref(commodity.geolocation)),
);

/**
 * Cattle can only be recorded with an LFBIS number (RinderNET link), so the
 * "Rinder" card is not offered to users of other login providers.
 * @type {ComputedRef<Array<import('~~/server/utils/soap-traces.js').CommodityDataWithKey>>}
 */
const commoditiesToAdd = computed(() =>
  COMMODITY_KEYS.filter((key) => key !== 'rind' || canSubmitCattle.value)
    .map((key) => ({ key, ...statements[key] }))
    .filter((commodity) => !Object.values(commodity.quantity.value).some((v) => v > 0)),
);

const canSend = computed(() =>
  COMMODITY_KEYS.some((key) => Object.values(statements[key].quantity.value).some((v) => v > 0)),
);

/**
 * @param {import('~~/shared/utils/constants.js').Commodity} commodity
 */
function openEditor(commodity) {
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
        geolocationVisible: hasGeolocationCommodity.value ? geolocationVisible.value : false,
      }),
    });
    await new Promise((r) => setTimeout(r, 1000));
    for (const key of COMMODITY_KEYS) {
      statements[key].clear();
    }
    useRouter().push('/account');
  } catch (error) {
    console.error('Failed to submit statement', error);
    // Without a message from our server (e.g. a gateway timeout), the submission may still be
    // in progress or may have succeeded.
    errorMessage.value =
      (error instanceof FetchError && error.data?.message) ||
      'Die Erklärung konnte nicht übermittelt werden. Möglicherweise wurde sie trotzdem erstellt. Bitte prüfen Sie unter "Mein Konto" — "Meine Identifikationsnummern", ob sie dort aufscheint, bevor Sie es erneut versuchen.';
  } finally {
    finish();
    clear();
  }
}

async function validate() {
  if (!editCommodity.value) {
    return true;
  }
  // PlacesForm shows its errors inline: a missing quantity, and in "Postanschrift"
  // mode the postal fields and MFA confirmation.
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

  <v-dialog
    :model-value="!!removeCommodity"
    max-width="400"
    @update:model-value="removeCommodity = null"
  >
    <v-card v-if="removeCommodity">
      <v-card-text>
        {{ COMMODITIES[removeCommodity].title }} aus der Erklärung entfernen? Die eingegebenen
        Mengen und Lokalisierungen gehen dabei verloren.
      </v-card-text>
      <v-card-actions>
        <v-btn @click="removeCommodity = null"> Abbrechen </v-btn>
        <v-btn color="error" @click="confirmRemove"> Entfernen </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="map" fullscreen>
    <v-card v-if="editCommodity" class="h-100">
      <v-toolbar>
        <v-btn :icon="mdiClose" @click="exitPlaces(editCommodity)"></v-btn>

        <v-app-bar-title>{{ COMMODITIES[editCommodity].title }}</v-app-bar-title>

        <action-tooltip v-if="editCommodityInStatement">
          <template #activator="{ props: on }">
            <v-btn :icon="mdiDeleteOutline" v-bind="on" @click="removeCommodity = editCommodity" />
          </template>
          Aus der Erklärung entfernen
        </action-tooltip>

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
            <v-row class="mt-2">
              <v-col
                v-for="item in commoditiesInStatement"
                :key="item.key"
                :cols="mdAndUp ? 4 : xs ? 12 : 6"
              >
                <CommodityCard :item="item" @open-editor="openEditor" />
              </v-col>
              <!-- An empty placeholder rather than full "Hinzufügen" cards, so the remaining
                   commodities don't look like part of the statement. -->
              <v-col v-if="commoditiesToAdd.length" :cols="mdAndUp ? 4 : xs ? 12 : 6">
                <!-- Centered over the box, so the choices appear where the "+" was. -->
                <v-menu location="center">
                  <template #activator="{ props: menu }">
                    <v-card
                      class="add-commodity d-flex align-center justify-center h-100"
                      variant="text"
                      min-height="180"
                      aria-label="Weiteren Rohstoff hinzufügen"
                      v-bind="menu"
                    >
                      <v-icon :icon="mdiPlus" size="50" />
                    </v-card>
                  </template>
                  <v-list>
                    <v-list-item
                      v-for="item in commoditiesToAdd"
                      :key="item.key"
                      :prepend-icon="COMMODITIES[item.key].icon"
                      :title="COMMODITIES[item.key].title"
                      @click="openEditor(item.key)"
                    />
                  </v-list>
                </v-menu>
              </v-col>
            </v-row>
            <v-divider class="mt-6" />
            <v-checkbox
              v-if="hasGeolocationCommodity"
              v-model="geolocationVisible"
              class="checkbox-with-help mt-4"
              hide-details
              density="compact"
            >
              <template #label>
                <div class="checkbox-with-help__text ml-1 text-body-2">
                  Einsicht in die Erzeugungsorte erlauben
                </div>
                <v-tooltip max-width="400" open-on-click :open-on-hover="false">
                  <template #activator="{ props }">
                    <v-btn
                      class="checkbox-with-help__help"
                      flat
                      :icon="mdiHelpCircleOutline"
                      size="x-small"
                      v-bind="props"
                    ></v-btn>
                  </template>
                  <div>
                    Wenn aktiviert, können alle, die die Identifikations- und Verifizierungsnummer
                    dieser Erklärung kennen, die Erzeugungsorte im EU-Informationssystem einsehen.
                    Das sind üblicherweise Ihre Abnehmer; diese können die Nummern jedoch
                    weitergeben. Wenn nicht aktiviert, werden die Erzeugungsorte als vertraulich
                    behandelt und nicht weitergegeben. Auf die übrigen Angaben der Erklärung und auf
                    die Einsicht durch die Behörden hat diese Einstellung keinen Einfluss.
                  </div>
                </v-tooltip>
              </template>
            </v-checkbox>
            <div class="text-body-1 mt-4">
              Hiermit beauftrage ich das Bundesministerium für Land- und Forstwirtschaft, Klima- und
              Umweltschutz, Regionen und Wasserwirtschaft (BMLUK), für mich als Bevollmächtiger im
              Sinne von Artikel 2 Ziffer 22 in Verbindung mit Artikel 6 der Verordnung (EU)
              2023/1115 aufzutreten und die von mir erstellte Vereinfachte Erklärung an das
              Informationssystem gemäß Artikel 33 dieser Verordnung zu übermitteln. Ich bestätige,
              die alleinige Verantwortung für den Inhalt der Vereinfachten Erklärung zu übernehmen.
            </div>
            <div class="text-body-1 mt-4">
              Durch Übermittlung dieser vereinfachten Erklärung für Kleinst- oder
              Kleinprimärerzeuger bestätige ich, dass ich die Sorgfaltspflicht gemäß der Verordnung
              (EU) 2023/1115 in Bezug auf die relevanten Erzeugnisse, die ich in Verkehr bringe oder
              ausführe, erfülle , und dass ich diese Erzeugnisse nur dann in Verkehr bringe oder
              ausführe, wenn kein oder lediglich ein vernachlässigbares Risiko dahingehend
              festgestellt wurde, dass die relevanten Erzeugnisse gegen Artikel 3 Buchstaben a oder
              b dieser Verordnung verstoßen.
            </div>
          </v-card-text>
          <v-card-actions v-if="canSend">
            <v-btn :prepend-icon="mdiCheckDecagram" color="primary" @click="submit">
              Bestätigen und übermitteln
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <!-- Nothing added yet: the heading card stays on its own, with the cards below it. -->
      <template v-if="!incomplete && !canSend">
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
.add-commodity {
  border: 2px dashed rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
