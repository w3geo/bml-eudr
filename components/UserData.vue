<script setup>
const { mdAndUp, xs } = useDisplay();
const { data: userData } = await useFetch('/api/users/me');

async function updateProfile() {
  await $fetch('/api/users/me', {
    method: 'PUT',
    body: userData.value,
  });
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
  <v-form v-if="userData">
    <v-row>
      <v-col :cols="mdAndUp ? 4 : 12">
        <v-text-field v-model="userData.name" label="Name" readonly disabled></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 8 : 12">
        <v-text-field v-model="userData.address" label="Adresse" readonly disabled></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 6 : 12">
        <v-text-field v-model="userData.email" label="e-mail (optional)" readonly></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 3 : xs ? 12 : 6">
        <v-select
          v-model="userData.identifierType"
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
          label="Identifikationsnummer"
          :readonly="userData.loginProvider === 'AMA'"
          :disabled="userData.loginProvider === 'AMA'"
        ></v-text-field>
      </v-col>
    </v-row>
    <v-btn @click="updateProfile">Speichern</v-btn>
  </v-form>
</template>
