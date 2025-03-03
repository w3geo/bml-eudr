<script setup>
import { mdiAlertCircleOutline } from '@mdi/js';
const { mdAndUp, xs } = useDisplay();
const { data: userData } = await useFetch('/api/users/me');

const snackbar = ref(false);
const form = ref();

async function updateProfile() {
  await $fetch('/api/users/me', {
    method: 'PUT',
    body: userData.value,
  });
  snackbar.value = true;
}

const idItems = [
  {
    title: 'GLN',
    value: 'GLN',
  },
  {
    title: 'Steuernummer',
    value: 'TIN',
  },
  {
    title: 'UID',
    value: 'VAT',
  },
];
</script>
<template>
  <v-form v-if="userData" ref="form">
    <v-row>
      <v-col :cols="mdAndUp ? 4 : 12">
        <v-text-field
          v-model="userData.name"
          variant="outlined"
          label="Name"
          readonly
          disabled
        ></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 8 : 12">
        <v-text-field
          v-model="userData.address"
          variant="outlined"
          label="Adresse"
          readonly
          disabled
        ></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 6 : 12">
        <v-text-field
          v-model="userData.email"
          variant="outlined"
          label="e-mail (optional)"
        ></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 3 : xs ? 12 : 6">
        <v-select
          v-model="userData.identifierType"
          variant="outlined"
          label="Identifikationstyp"
          :items="idItems"
          item-value="value"
          item-text="title"
          :readonly="userData.loginProvider === 'AMA'"
          :disabled="userData.loginProvider === 'AMA'"
        ></v-select>
      </v-col>
      <v-col :cols="mdAndUp ? 3 : xs ? 12 : 6">
        <v-text-field
          v-model="userData.identifierValue"
          variant="outlined"
          label="Identifikationsnummer"
          :readonly="userData.loginProvider === 'AMA'"
          :disabled="userData.loginProvider === 'AMA'"
        ></v-text-field>
      </v-col>
      <v-col cols="12" class="text-body-1 mb-6">
        <v-alert :icon="mdiAlertCircleOutline">
          Felder, die von Ihrem Login-Provider bereitgestellt werden, können nicht bearbeitet
          werden.
        </v-alert>
      </v-col>
    </v-row>
    <v-btn @click="updateProfile">Speichern</v-btn>
    <v-snackbar v-model="snackbar" timeout="2000"> Daten wurden gespeichert. </v-snackbar>
  </v-form>
</template>
