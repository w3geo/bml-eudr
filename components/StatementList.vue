<script setup>
import { mdiCardBulletedOutline } from '@mdi/js';

const { mdAndUp } = useDisplay();
const statementCount = ref(0);

const { data: statements } = await useFetch('/api/statements');
statementCount.value = statements.value?.length || 0;
</script>

<template>
  <v-row v-if="statementCount > 0">
    <v-col v-for="item in statements" :key="item.id" :cols="mdAndUp ? 6 : 12">
      <v-card color="teal-darken-4">
        <v-card-title>{{ item.referenceNumber || 'Wird erstellt' }}</v-card-title>
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
              <template v-for="(value, key) in item.statement.commodities" :key="key">
                <tr v-if="value.geojson.features.length">
                  <td>
                    <v-icon
                      :icon="
                        COMMODITIES[/** @type {import('~/utils/constants').Commodity} */ (key)]
                          ?.icon || mdiCardBulletedOutline
                      "
                    />
                  </td>
                  <td>
                    {{
                      getCommoditySummary({
                        key: /** @type {import('~/utils/constants').Commodity} */ (key),
                        ...value,
                      })
                    }}
                  </td>
                </tr>
              </template>
            </tbody>
          </v-table>
        </v-card-text>
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
