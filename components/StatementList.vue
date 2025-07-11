<script setup>
import { mdiCardBulletedOutline, mdiEmailFastOutline, mdiMessageTextOutline } from '@mdi/js';

const { mdAndUp } = useDisplay();
const statementCount = ref(0);

const { data: statements } = await useFetch('/api/statements');
const { data: userData } = await useFetch('/api/users/me');
statementCount.value = statements.value?.length || 0;
</script>

<template>
  <v-row v-if="statementCount > 0">
    <v-col v-for="item in statements" :key="item.id" :cols="mdAndUp ? 6 : 12">
      <v-card color="teal-darken-4">
        <v-card-title>{{
          item.referenceNumber || (item.ddsId ? 'Wird erstellt' : 'Entwurf')
        }}</v-card-title>
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
          Rohstoffe/Erzeugnisse
          <v-table density="compact">
            <tbody>
              <template v-for="value in item.statement.commodities" :key="value.key">
                <tr v-if="value.geojson.features.length">
                  <td>
                    <v-icon
                      :icon="
                        COMMODITIES[
                          /** @type {import('~/utils/constants').Commodity} */ (value.key)
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
        </v-card-text>
        <v-card-actions>
          <v-btn
            v-if="item.referenceNumber"
            :prepend-icon="mdiEmailFastOutline"
            :href="`mailto:?subject=EUDR Referenznummer von ${userData?.name}&body=${encodeURIComponent(
              `Referenznummer: ${item.referenceNumber}\nVerifikationsnummer: ${item.verificationNumber}\n${getCommoditiesSummary(
                item.statement.commodities,
              )}`,
            )}`"
            >E-Mail</v-btn
          >
          <v-btn
            v-if="item.referenceNumber"
            :prepend-icon="mdiMessageTextOutline"
            :href="`sms:?body=${encodeURIComponent(
              `EUDR Referenznummer von ${userData?.name}\n\nReferenznummer: ${item.referenceNumber}\nVerifikationsnummer: ${item.verificationNumber}\n${getCommoditiesSummary(
                item.statement.commodities,
              )}`,
            )}`"
            >SMS</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
  <v-row v-else>
    <v-col
      >Noch keine vorhanden. Erstellen Sie eine
      <NuxtLink to="/statement">Sorgfaltspflichterklärung</NuxtLink>.</v-col
    >
  </v-row>
</template>
