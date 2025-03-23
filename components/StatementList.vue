<script setup>
const { mdAndUp } = useDisplay();
const { data } = await useFetch('/api/statements');
</script>

<template>
  <v-row>
    <v-col v-for="item in data" :key="item.id" :cols="mdAndUp ? 6 : 12">
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
                <tr v-if="value.summary">
                  <td>
                    <v-icon
                      :icon="
                        COMMODITIES[/** @type {import('~/utils/constants').Commodity} */ (key)].icon
                      "
                    />
                    {{
                      COMMODITIES[/** @type {import('~/utils/constants').Commodity} */ (key)].title
                    }}
                  </td>
                  <td>{{ value.summary }}</td>
                </tr>
              </template>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>
