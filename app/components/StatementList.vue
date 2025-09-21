<script setup>
import {
  mdiCardBulletedOutline,
  mdiEmailFastOutline,
  mdiMessageTextOutline,
  mdiRefreshCircle,
  mdiUnfoldLessHorizontal,
  mdiUnfoldMoreHorizontal,
} from '@mdi/js';

const { mdAndUp } = useDisplay();
const { start, finish, clear } = useLoadingIndicator();
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
  } catch (error) {
    if (error instanceof Error) {
      clear();
      console.error('Failed to retrieve DDS data', error.message);
    }
    return;
  }
  finish();
  clear();

  statements.value = [...statements.value];
}
</script>

<template>
  <v-row v-if="statementCount > 0">
    <v-col v-for="item in statements" :key="item.ddsId" :cols="mdAndUp ? 6 : 12">
      <v-card color="teal-darken-4">
        <v-card-title class="pt-0 pb-0">
          <v-toolbar flat color="transparent" density="compact"
            >{{ item.referenceNumber || 'Wird erstellt...' }}<v-spacer />
            <v-tooltip open-on-click>
              <template #activator="{ props }">
                <v-btn
                  flat
                  density="compact"
                  :icon="
                    item.referenceNumber
                      ? item.commodities
                        ? mdiUnfoldLessHorizontal
                        : mdiUnfoldMoreHorizontal
                      : mdiRefreshCircle
                  "
                  v-bind="props"
                  @click="toggleFullStatement(item.ddsId)"
                ></v-btn>
              </template>
              {{
                item.referenceNumber
                  ? item.commodities
                    ? 'Details ausblenden'
                    : 'Referenznummer teilen, Details ansehen'
                  : 'Aktualisieren'
              }}
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
          <template v-if="item.commodities">
            <br />
            <v-table density="compact">
              <tbody>
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
            </v-table>
          </template>
        </v-card-text>
        <v-card-actions v-if="item.commodities">
          <v-btn
            v-if="item.referenceNumber"
            :prepend-icon="mdiEmailFastOutline"
            :href="`mailto:?subject=EUDR Sorgfaltserklärung von ${userData?.name}&body=${encodeURIComponent(
              `Ersteller: ${userData?.name}\nReferenznummer: ${item.referenceNumber}\nVerifikationsnummer: ${item.verificationNumber}\nErklärungsdatum: ${new Date(item.date).toLocaleString('sv-SE')}\n${getCommoditiesSummary(
                item.commodities,
              )}`,
            )}`"
          >
            E-Mail
          </v-btn>
          <v-btn
            v-if="item.referenceNumber"
            :prepend-icon="mdiMessageTextOutline"
            :href="`sms:?body=${encodeURIComponent(
              `EUDR Sorgfaltserklärung\n\nErsteller: ${userData?.name}\nReferenznummer: ${item.referenceNumber}\nVerifikationsnummer: ${item.verificationNumber}\nErklärungsdatum: ${new Date(item.date).toLocaleString('sv-SE')}\n${getCommoditiesSummary(
                item.commodities,
              )}`,
            )}`"
          >
            SMS
          </v-btn>
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
