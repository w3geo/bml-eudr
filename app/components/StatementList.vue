<script setup>
import {
  mdiCardBulletedOutline,
  mdiContentCopy,
  mdiEmailFastOutline,
  mdiMessageTextOutline,
  mdiRefreshCircle,
  mdiTableArrowDown,
} from '@mdi/js';

const { mdAndUp } = useDisplay();
const { start, finish, clear } = useLoadingIndicator();
const { errorMessage } = useErrorMessage();
const statementCount = ref(0);

const { data: statements, error: statementsError } = await useFetch('/api/statements');
const { data: userData } = await useFetch('/api/users/me');

statementCount.value = statements.value?.length || 0;

const autoRefreshStatements = statements.value?.filter((s) => !s.referenceNumber);

onNuxtReady(() => {
  if (autoRefreshStatements && autoRefreshStatements.length > 0) {
    const interval = setInterval(async () => {
      for (const s of autoRefreshStatements) {
        await toggleFullStatement(s.ddsId);
      }
      if (statements.value?.every((s) => s.referenceNumber)) {
        clearInterval(interval);
      }
    }, 30000);
  }
});

/**
 * @param {string} ddsId
 */
async function toggleFullStatement(ddsId) {
  if (!statements.value) {
    return;
  }
  const statement = statements.value?.find((s) => s.ddsId === ddsId);
  if (!statement) {
    console.error('No such statement', ddsId);
    return;
  }

  if (statement.referenceNumber && statement.commodities) {
    delete statement.commodities;
    statements.value = [...statements.value];
    return;
  }

  try {
    start();
    const data = await $fetch(`/api/statements/${ddsId}`);
    Object.assign(statement, data);
    statements.value = [...statements.value];
  } catch (error) {
    if (error instanceof Error) {
      clear();
      console.error('Failed to retrieve DDS data', error.message);
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
    await toggleFullStatement(statement.ddsId);
  }
  if (!statement.commodities) {
    errorMessage.value =
      'Details zu dieser Sorgfaltserklärung konnten nicht abgerufen werden. Versuchen Sie es später erneut.';
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
    `mailto:?subject=EUDR Sorgfaltserklärung von ${userData.value?.name}&body=${encodeURIComponent(
      `Ersteller: ${userData.value?.name}\nReferenznummer: ${statement.referenceNumber}\nVerifikationsnummer: ${statement.verificationNumber}\nErklärungsdatum: ${new Date(statement.date).toLocaleString('sv-SE')}\n${getCommoditiesSummary(
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
      `EUDR Sorgfaltserklärung\n\nErsteller: ${userData.value?.name}\nReferenznummer: ${statement.referenceNumber}\nVerifikationsnummer: ${statement.verificationNumber}\nErklärungsdatum: ${new Date(statement.date).toLocaleString('sv-SE')}\n${getCommoditiesSummary(
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
      `EUDR Sorgfaltserklärung\n\nErsteller: ${userData.value?.name}\nReferenznummer: ${statement.referenceNumber}\nVerifikationsnummer: ${statement.verificationNumber}\nErklärungsdatum: ${new Date(statement.date).toLocaleString('sv-SE')}\n${getCommoditiesSummary(
        commodities,
      )}`,
    );
  } catch {
    errorMessage.value =
      'Die Sorgfaltserklärung konnte nicht in die Zwischenablage kopiert werden. Bitte klicken Sie erneut auf "Kopieren".';
  }
};
</script>

<template>
  <v-row v-if="statementCount > 0">
    <v-col v-for="item in statements" :key="item.ddsId" :cols="mdAndUp ? 6 : 12">
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
                  @click="toggleFullStatement(item.ddsId)"
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
                <td>{{ item.status }}</td>
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
                  <td>
                    {{ getCommoditySummary(value) }}
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
                    @click="toggleFullStatement(item.ddsId)"
                    >Details laden</v-btn
                  >
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions v-if="item.referenceNumber">
          <v-btn :prepend-icon="mdiContentCopy" @click="copyToClipboard(item)">Kopieren</v-btn>
          <v-btn :prepend-icon="mdiEmailFastOutline" @click="sendEmail(item)">E-Mail</v-btn>
          <v-btn :prepend-icon="mdiMessageTextOutline" @click="sendTextMessage(item)">SMS</v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
  <v-row v-else>
    <v-col v-if="statementsError">
      Fehler beim Laden: {{ statementsError.data.message }}. Versuchen Sie es später erneut.
    </v-col>
    <v-col v-else>
      Noch keine vorhanden. Erstellen Sie eine
      <NuxtLink to="/statement"> Sorgfaltserklärung </NuxtLink>.
    </v-col>
  </v-row>
</template>
