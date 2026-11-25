<script setup>
import {
  mdiCardBulletedOutline,
  mdiContentCopy,
  mdiEmailFastOutline,
  mdiHelpCircleOutline,
  mdiMap,
  mdiMessageTextOutline,
  mdiPencil,
  mdiPrinter,
  mdiTableArrowDown,
} from '@mdi/js';
import { FetchError } from 'ofetch';

const { mdAndUp } = useDisplay();
const { start, finish, clear } = useLoadingIndicator();
const { errorMessage } = useErrorMessage();
const statementCount = ref(0);

// Shallow, so the GeoJSON passed to the map does not become deeply reactive.
const mapDialog = shallowReactive({
  open: false,
  // prettier-ignore
  geojson: /** @type {import('geojson').FeatureCollection<import('geojson').Geometry|null>|undefined} */ (undefined),
  commodity: /** @type {import('~~/shared/utils/constants.js').Commodity|undefined} */ (undefined),
});
/**
 * @param {import('geojson').FeatureCollection<import('geojson').Geometry|null>} geojson
 * @param {string} commodity
 */
function openMapDialog(geojson, commodity) {
  mapDialog.geojson = geojson;
  mapDialog.commodity = /** @type {import('~~/shared/utils/constants.js').Commodity} */ (commodity);
  mapDialog.open = true;
}

const { data: statements, error: statementsError } = await useFetch('/api/statements');
const { data: userData } = await useFetch('/api/users/me');
const statementsErrorMessage = computed(
  () => /** @type {{ message?: string }|undefined} */ (statementsError.value?.data)?.message,
);

statementCount.value = statements.value?.length || 0;

// TRACES issues reference numbers in batches every 5 minutes (around :00, :05, :10, ...), so
// pending statements are checked once shortly after each batch, with a single request for all.
const BATCH_INTERVAL = 5 * 60 * 1000;
const BATCH_DELAY = 20 * 1000;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let refreshTimeout;

function scheduleRefresh() {
  clearTimeout(refreshTimeout);
  if (!statements.value?.some((s) => !s.referenceNumber)) {
    return;
  }
  const delay = BATCH_INTERVAL - ((Date.now() - BATCH_DELAY) % BATCH_INTERVAL);
  refreshTimeout = setTimeout(refreshPending, delay);
}

async function refreshPending() {
  if (document.hidden) {
    document.addEventListener('visibilitychange', refreshPending, { once: true });
    return;
  }
  try {
    const fresh = await $fetch('/api/statements');
    statements.value =
      fresh?.map((s) => {
        const current = statements.value?.find((c) => c.sdId === s.sdId);
        // Keep details that were already loaded.
        return current?.commodities ? { ...s, commodities: current.commodities } : s;
      }) ?? statements.value;
  } catch (error) {
    console.error('Failed to refresh statements', error);
  }
  scheduleRefresh();
}

onNuxtReady(scheduleRefresh);
onBeforeUnmount(() => {
  clearTimeout(refreshTimeout);
  document.removeEventListener('visibilitychange', refreshPending);
});

// Make sure server and browser use the same time zone when rendering dates
/** @param {string} date */
const formatDate = (date) => new Date(date).toLocaleString('sv-SE', { timeZone: 'Europe/Vienna' });

/**
 * @param {import('~~/server/utils/soap-traces').StatementInfo} statement
 * @returns {string} e.g. "(v2)", empty for version 1
 */
const formatVersion = (statement) =>
  (statement.version ?? 1) > 1 ? `(v${statement.version})` : '';

/**
 * @param {import('~~/server/utils/soap-traces').StatementInfo} statement
 * @returns {string}
 */
const getNumberLines = (statement) =>
  `Identifikationsnummer: ${[statement.referenceNumber, formatVersion(statement)].filter(Boolean).join(' ')}\nPrüfnummer: ${statement.verificationNumber}\nErklärungsdatum: ${formatDate(statement.date)}\n`;

const DETAILS_ERROR_MESSAGE =
  'Details zu dieser Erklärung konnten nicht abgerufen werden. Bitte versuchen Sie es später erneut.';

/**
 * @param {string} sdId
 */
async function toggleFullStatement(sdId) {
  if (!statements.value) {
    return;
  }
  const statement = statements.value?.find((s) => s.sdId === sdId);
  if (!statement) {
    console.error('No such statement', sdId);
    return;
  }

  if (statement.commodities) {
    delete statement.commodities;
    statements.value = [...statements.value];
    return;
  }

  try {
    start();
    const data = await $fetch(`/api/statements/${sdId}`);
    Object.assign(statement, data);
    statements.value = [...statements.value];
  } catch (error) {
    if (error instanceof Error) {
      clear();
      console.error('Failed to retrieve SD data', error.message);
    }
    if (error instanceof FetchError && error.statusCode === 404) {
      // The statement is no longer available, e.g. because it was withdrawn.
      statements.value = statements.value.filter((s) => s.sdId !== sdId);
      statementCount.value = statements.value.length;
    }
    errorMessage.value =
      (error instanceof FetchError && error.data?.message) || DETAILS_ERROR_MESSAGE;
  } finally {
    finish();
    clear();
  }
}

/**
 * @param {import('~~/server/utils/soap-traces').StatementInfo} statement
 * @returns {Promise<Array<import('~~/server/utils/soap-traces').PlainCommodityDataWithKey>|undefined>}
 */
const getCommodities = async (statement) => {
  if (!statement.commodities) {
    await toggleFullStatement(statement.sdId);
  }
  if (!statement.commodities) {
    // toggleFullStatement may already have shown a more specific message.
    errorMessage.value ||= DETAILS_ERROR_MESSAGE;
    return;
  }
  return statement.commodities;
};

/**
 * @returns {string|undefined}
 */
const getOperatorName = () => userData.value?.name;

/**
 * Address line as in the print preview, or an empty string if there is no address.
 * @returns {string}
 */
const getOperatorAddressLine = () =>
  userData.value?.address
    ? `Anschrift: ${formatAddress(userData.value.address)}, Österreich\n`
    : '';

/**
 * @param href {string}
 */
const createAndClickLink = (href) => {
  const link = document.createElement('a');
  link.type = 'hidden';
  link.href = href;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * @param {import('~~/server/utils/soap-traces').StatementInfo} statement
 * @returns {Promise<void>}
 */
const sendEmail = async (statement) => {
  const commodities = await getCommodities(statement);
  if (!commodities) {
    return;
  }
  createAndClickLink(
    `mailto:?subject=EUDR Vereinfachte Erklärung von ${getOperatorName()}&body=${encodeURIComponent(
      `Ersteller: ${getOperatorName()}\n${getOperatorAddressLine()}${getNumberLines(statement)}${getCommoditiesSummary(
        commodities,
      )}`,
    )}`,
  );
};

/**
 * @param {import('~~/server/utils/soap-traces').StatementInfo} statement
 * @returns {Promise<void>}
 */
const sendTextMessage = async (statement) => {
  const commodities = await getCommodities(statement);
  if (!commodities) {
    return;
  }
  createAndClickLink(
    `sms:?body=${encodeURIComponent(
      `EUDR Vereinfachte Erklärung\n\nErsteller: ${getOperatorName()}\n${getNumberLines(statement)}${getCommoditiesSummary(
        commodities,
      )}`,
    )}`,
  );
};

const copied = ref(false);

/**
 * @param {import('~~/server/utils/soap-traces').StatementInfo} statement
 * @returns {Promise<void>}
 */
const copyToClipboard = async (statement) => {
  errorMessage.value = null;
  copied.value = false;
  const commodities = await getCommodities(statement);
  if (!commodities) {
    return;
  }
  try {
    await navigator.clipboard.writeText(
      `EUDR Vereinfachte Erklärung\n\nErsteller: ${getOperatorName()}\n${getNumberLines(statement)}${getCommoditiesSummary(
        commodities,
      )}`,
    );
    copied.value = true;
  } catch {
    errorMessage.value =
      'Die Erklärung konnte nicht in die Zwischenablage kopiert werden. Bitte klicken Sie erneut auf „Kopieren“.';
  }
};
</script>

<template>
  <v-row v-if="statementCount > 0">
    <v-col v-for="item in statements" :key="item.sdId" :cols="mdAndUp ? 6 : 12">
      <v-card color="green-darken-4">
        <v-card-item>
          <div class="text-caption">Identifikationsnummer</div>
          <v-card-title class="pa-0 d-flex align-center ga-1">
            <template v-if="item.referenceNumber">
              {{ item.referenceNumber }}
              <span v-if="formatVersion(item)" class="text-medium-emphasis">
                {{ formatVersion(item) }}
              </span>
            </template>
            <template v-else>
              Wird erstellt...
              <v-spacer />
              <v-tooltip max-width="400" open-on-click :open-on-hover="false">
                <template #activator="{ props }">
                  <v-btn
                    flat
                    color="transparent"
                    :icon="mdiHelpCircleOutline"
                    aria-label="Hilfe"
                    size="small"
                    density="comfortable"
                    v-bind="props"
                  ></v-btn>
                </template>
                Die Identifikationsnummer wird hier angezeigt, sobald sie vom EU-Informationssystem
                vergeben wurde. Das dauert üblicherweise etwa 5 Minuten.
              </v-tooltip>
            </template>
          </v-card-title>
        </v-card-item>
        <v-card-text :class="{ 'pb-0': item.referenceNumber }">
          <v-table density="compact">
            <tbody>
              <tr>
                <td>Prüfnummer</td>
                <td>{{ item.verificationNumber }}</td>
              </tr>
              <tr>
                <td>Erklärungsdatum</td>
                <td>{{ formatDate(item.date) }}</td>
              </tr>
              <tr>
                <td>Status</td>
                <td>{{ STATUS_LABELS[item.status] ?? item.status }}</td>
              </tr>
            </tbody>
          </v-table>
          <br />
          <v-table density="compact">
            <tbody v-if="item.commodities">
              <template v-for="value in item.commodities" :key="value.key">
                <tr>
                  <td>
                    <v-icon
                      :icon="
                        COMMODITIES[
                          /** @type {import('~~/shared/utils/constants').Commodity} */ (value.key)
                        ]?.icon || mdiCardBulletedOutline
                      "
                    />
                  </td>
                  <td style="width: 100%">
                    {{ getCommoditySummary(value) }}
                  </td>
                  <td>
                    <v-btn
                      v-if="value.geojson?.features?.some((f) => f.geometry)"
                      density="compact"
                      variant="text"
                      :icon="mdiMap"
                      aria-label="Lokalisierungen auf der Karte anzeigen"
                      @click="openMapDialog(value.geojson, value.key)"
                    />
                  </td>
                </tr>
              </template>
              <tr v-if="item.commodities.length === 0">
                <td colspan="3" class="text-medium-emphasis">
                  Für diese Erklärung sind keine Details gespeichert.
                </td>
              </tr>
              <tr
                v-else-if="
                  item.geolocationVisible === false &&
                  item.commodities.some((c) => c.geojson?.features?.length)
                "
              >
                <td colspan="3" class="text-medium-emphasis">
                  Erzeugungsorte vertraulich übermittelt
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr>
                <td class="text-center">
                  <v-btn
                    flat
                    :prepend-icon="mdiTableArrowDown"
                    @click="toggleFullStatement(item.sdId)"
                    >Details laden</v-btn
                  >
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions v-if="item.referenceNumber" class="statement-actions">
          <v-btn
            stacked
            size="small"
            :prepend-icon="mdiEmailFastOutline"
            :aria-label="`Erklärung ${item.referenceNumber} per E-Mail teilen`"
            @click="sendEmail(item)"
          >
            E-Mail
          </v-btn>
          <v-btn
            stacked
            size="small"
            :prepend-icon="mdiMessageTextOutline"
            :aria-label="`Erklärung ${item.referenceNumber} per SMS teilen`"
            @click="sendTextMessage(item)"
          >
            SMS
          </v-btn>
          <v-btn
            stacked
            size="small"
            :prepend-icon="mdiContentCopy"
            :aria-label="`Erklärung ${item.referenceNumber} kopieren`"
            @click="copyToClipboard(item)"
          >
            Kopieren
          </v-btn>
          <v-btn
            stacked
            size="small"
            :prepend-icon="mdiPrinter"
            :aria-label="`Erklärung ${item.referenceNumber} drucken`"
            :to="`/print/${item.sdId}`"
          >
            Drucken
          </v-btn>
          <v-btn
            v-if="item.status === 'AVAILABLE'"
            class="ml-auto"
            stacked
            size="small"
            :prepend-icon="mdiPencil"
            :aria-label="`Erklärung ${item.referenceNumber} ändern`"
            :to="`/statement?edit=${item.sdId}`"
          >
            Ändern
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
  <v-row v-else>
    <v-col v-if="statementsError">
      {{
        statementsErrorMessage ||
        'Die Erklärungen konnten nicht geladen werden. Bitte versuchen Sie es später erneut.'
      }}
    </v-col>
    <v-col v-else>
      Noch keine vorhanden. Erstellen Sie eine
      <NuxtLink to="/statement"> vereinfachte Erklärung </NuxtLink>.
    </v-col>
  </v-row>
  <v-snackbar v-model="copied" timeout="3000">
    Die Erklärung wurde in die Zwischenablage kopiert.
  </v-snackbar>
  <geolocations-dialog
    v-model="mapDialog.open"
    :geojson="mapDialog.geojson"
    :commodity="mapDialog.commodity"
  />
</template>

<style scoped>
/* Five labelled buttons have to fit into one row on a 320px wide phone */
.statement-actions {
  gap: 4px;
}
.statement-actions .v-btn {
  min-width: 0;
  padding: 0 4px;
  letter-spacing: normal;
  text-transform: none;
}
/* Vuetify's focus overlay is barely visible on the dark green card */
.statement-actions .v-btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}
</style>
