<script setup>
import {
  mdiCardBulletedOutline,
  mdiContentCopy,
  mdiEmailFastOutline,
  mdiMap,
  mdiMenuDown,
  mdiMessageTextOutline,
  mdiPrinter,
  mdiRefreshCircle,
  mdiShareVariant,
  mdiTableArrowDown,
} from '@mdi/js';
import { FetchError } from 'ofetch';

const { mdAndUp } = useDisplay();
const { start, finish, clear } = useLoadingIndicator();
const { errorMessage } = useErrorMessage();
const statementCount = ref(0);

const mapDialog = reactive({
  open: false,
  // prettier-ignore
  geojson: /** @type {import('geojson').FeatureCollection<import('geojson').Geometry|null>|undefined} */ (undefined),
  commodity: /** @type {import('~~/shared/utils/constants.js').Commodity|undefined} */ (undefined),
});
/**
 * @param {import('geojson').FeatureCollection<import('geojson').Geometry|null>|import('vue').Ref<import('geojson').FeatureCollection<import('geojson').Geometry|null>>} geojson
 * @param {string} commodity
 */
function openMapDialog(geojson, commodity) {
  mapDialog.geojson = unref(geojson);
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
        // Keep details that were already loaded for completed statements.
        return current?.referenceNumber && current.commodities
          ? { ...s, commodities: current.commodities }
          : s;
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

  if (statement.referenceNumber && statement.commodities) {
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
    if (error instanceof FetchError && error.data?.message) {
      errorMessage.value = error.data.message;
    }
  } finally {
    finish();
    clear();
  }
}

/**
 * @param {import('~~/server/utils/soap-traces').StatementInfo} statement
 * @returns {Promise<Array<import('~~/server/utils/soap-traces').CommodityDataWithKey>|undefined>}
 */
const getCommodities = async (statement) => {
  if (!statement.commodities) {
    await toggleFullStatement(statement.sdId);
  }
  if (!statement.commodities) {
    // toggleFullStatement may already have shown a more specific message.
    errorMessage.value ||=
      'Details zu dieser Vereinfachten Erklärung konnten nicht abgerufen werden. Bitte versuchen Sie es später erneut.';
    return;
  }
  return statement.commodities;
};

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
    `mailto:?subject=EUDR Vereinfachte Erklärung von ${userData.value?.name}&body=${encodeURIComponent(
      `Ersteller: ${userData.value?.name}\nIdentifikationsnummer: ${statement.referenceNumber}\nVerifikationsnummer: ${statement.verificationNumber}\nErklärungsdatum: ${new Date(statement.date).toLocaleString('sv-SE')}\n${getCommoditiesSummary(
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
      `EUDR Vereinfachte Erklärung\n\nErsteller: ${userData.value?.name}\nIdentifikationsnummer: ${statement.referenceNumber}\nVerifikationsnummer: ${statement.verificationNumber}\nErklärungsdatum: ${new Date(statement.date).toLocaleString('sv-SE')}\n${getCommoditiesSummary(
        commodities,
      )}`,
    )}`,
  );
};

/**
 * @param {import('~~/server/utils/soap-traces').StatementInfo} statement
 * @returns {Promise<void>}
 */
const copyToClipboard = async (statement) => {
  errorMessage.value = null;
  const commodities = await getCommodities(statement);
  if (!commodities) {
    return;
  }
  try {
    await navigator.clipboard.writeText(
      `EUDR Vereinfachte Erklärung\n\nErsteller: ${userData.value?.name}\nIdentifikationsnummer: ${statement.referenceNumber}\nVerifikationsnummer: ${statement.verificationNumber}\nErklärungsdatum: ${new Date(statement.date).toLocaleString('sv-SE')}\n${getCommoditiesSummary(
        commodities,
      )}`,
    );
  } catch {
    errorMessage.value =
      'Die Vereinfachte Erklärung konnte nicht in die Zwischenablage kopiert werden. Bitte klicken Sie erneut auf "Kopieren".';
  }
};
</script>

<template>
  <v-row v-if="statementCount > 0">
    <v-col v-for="item in statements" :key="item.sdId" :cols="mdAndUp ? 6 : 12">
      <v-card color="green-darken-4">
        <v-card-title class="pt-0 pb-0">
          <v-toolbar flat color="transparent" density="compact"
            >{{ item.referenceNumber || 'Wird erstellt...' }}<v-spacer />
            <v-tooltip v-if="!item.referenceNumber" open-on-click>
              <template #activator="{ props }">
                <v-btn
                  flat
                  density="compact"
                  :icon="mdiRefreshCircle"
                  v-bind="props"
                  @click="toggleFullStatement(item.sdId)"
                ></v-btn>
              </template>
              Aktualisieren
            </v-tooltip>
          </v-toolbar>
        </v-card-title>
        <v-card-text>
          <v-table density="compact">
            <tbody>
              <tr>
                <td>Verifikationsnummer</td>
                <td>{{ item.verificationNumber }}</td>
              </tr>
              <tr>
                <td>Erklärungsdatum</td>
                <td>{{ new Date(item.date).toLocaleString('sv-SE') }}</td>
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
                      v-if="unref(value.geojson)?.features?.some((f) => f.geometry)"
                      density="compact"
                      variant="text"
                      :icon="mdiMap"
                      @click="openMapDialog(value.geojson, value.key)"
                    />
                  </td>
                </tr>
              </template>
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
        <v-card-actions v-if="item.referenceNumber">
          <v-menu>
            <template #activator="{ props }">
              <v-btn v-bind="props" :prepend-icon="mdiShareVariant" :append-icon="mdiMenuDown">
                Teilen
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item :prepend-icon="mdiContentCopy" @click="copyToClipboard(item)">
                Kopieren
              </v-list-item>
              <v-list-item :prepend-icon="mdiEmailFastOutline" @click="sendEmail(item)">
                E-Mail
              </v-list-item>
              <v-list-item :prepend-icon="mdiMessageTextOutline" @click="sendTextMessage(item)">
                SMS
              </v-list-item>
            </v-list>
          </v-menu>
          <v-btn :prepend-icon="mdiPrinter" :to="`/print/${item.sdId}`">Drucken</v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
  <v-row v-else>
    <v-col v-if="statementsError">
      {{
        statementsErrorMessage ||
        'Die Vereinfachten Erklärungen konnten nicht geladen werden. Bitte versuchen Sie es später erneut.'
      }}
    </v-col>
    <v-col v-else>
      Noch keine vorhanden. Erstellen Sie eine
      <NuxtLink to="/statement"> Vereinfachte Erklärung </NuxtLink>.
    </v-col>
  </v-row>
  <geolocations-dialog
    v-model="mapDialog.open"
    :geojson="mapDialog.geojson"
    :commodity="mapDialog.commodity"
  />
</template>
