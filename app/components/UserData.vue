<script setup>
import { mdiInformationOutline } from '@mdi/js';

const props = defineProps({
  verbose: Boolean,
});

const snackbar = ref(false);
const form = ref();
/** @type {Ref<import('~/utils/utils').EditableUserData|undefined>} */
const editableUserData = ref();
const canSave = ref(false);

async function validate() {
  const { valid } = await form.value.validate();
  return valid;
}

async function save() {
  if (!canSave.value) {
    return;
  }
  await $fetch('/api/users/me', {
    method: 'PUT',
    body: editableUserData.value,
  });
  snackbar.value = true;
}

defineExpose({
  validate,
  save,
  canSave,
});

const { data: userData } = await useFetch('/api/users/me');
editableUserData.value = userData.value;
const loginProvidedFields = userData.value
  ? (LOGIN_PROVIDED_FIELDS[userData.value.loginProvider] ?? [])
  : [];
canSave.value = loginProvidedFields.length < 4;

const { mdAndUp, xs } = useDisplay();

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
  <v-form v-if="editableUserData" ref="form" validate-on="submit lazy" @submit.prevent="save">
    <v-row>
      <v-col :cols="mdAndUp ? 4 : 12">
        <v-text-field
          v-model="editableUserData.name"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="Name"
          :readonly="loginProvidedFields.includes('name')"
          :disabled="loginProvidedFields.includes('name')"
          :rules="[(v) => !!v || 'Name ist erforderlich']"
        ></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 8 : 12">
        <v-text-field
          v-model="editableUserData.address"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="Straße Hausnummer, PLZ Ort"
          :readonly="loginProvidedFields.includes('address')"
          :disabled="loginProvidedFields.includes('address')"
          :rules="[(v) => !!v || 'Adresse ist erforderlich']"
        ></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 4 : xs ? 12 : 6">
        <v-select
          v-model="editableUserData.identifierType"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="Identifikationstyp"
          :items="idItems"
          item-value="value"
          item-text="title"
          :readonly="loginProvidedFields.includes('identifierType')"
          :disabled="loginProvidedFields.includes('identifierType')"
          :rules="[(v) => !!v || 'Identifikationstyp ist erforderlich']"
        ></v-select>
      </v-col>
      <v-col :cols="mdAndUp ? 8 : xs ? 12 : 6">
        <v-text-field
          v-model="editableUserData.identifierValue"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="Identifikationsnummer"
          :readonly="loginProvidedFields.includes('identifierValue')"
          :disabled="loginProvidedFields.includes('identifierValue')"
          :rules="[(v) => !!v || 'Identifikationsnummer ist erforderlich']"
        ></v-text-field>
      </v-col>
      <v-col v-if="props.verbose && canSave" cols="12" class="text-body-1 mb-2">
        <v-alert v-if="loginProvidedFields.length > 0" :icon="mdiInformationOutline" class="mb-4">
          Nicht editierbare Felder wurden vom Anmeldedienst übernommen.
        </v-alert>
        Mit dem Klicken auf "Speichern" stimme ich zu, dass meine Daten zum Zweck der Erstellung von
        Sorgfaltserklärungen gespeichert und verarbeitet werden.
      </v-col>
    </v-row>
    <v-snackbar v-if="props.verbose && canSave" v-model="snackbar" timeout="2000">
      Benutzerdaten wurden gespeichert.
    </v-snackbar>
  </v-form>
</template>
