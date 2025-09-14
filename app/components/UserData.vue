<script setup>
import { mdiInformationOutline } from '@mdi/js';
import { saveUserData } from '~/utils/utils';

const props = defineProps({
  verbose: Boolean,
});

const snackbar = ref(false);
const form = ref();

async function validate() {
  const { valid } = await form.value.validate();
  return valid;
}

async function save() {
  await saveUserData(editableUserData);
  snackbar.value = true;
}

defineExpose({
  validate,
  save,
});

const { data: userData } = await useFetch('/api/users/me');
const editableUserData = ref(userData.value);
const loginProvidedFields = userData.value
  ? LOGIN_PROVIDED_FIELDS[userData.value.loginProvider]
  : [];

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
          label="Adresse"
          :readonly="loginProvidedFields.includes('address')"
          :disabled="loginProvidedFields.includes('address')"
          :rules="[(v) => !!v || 'Adresse ist erforderlich']"
        ></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 6 : 12">
        <v-text-field
          v-model="editableUserData.email"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="e-mail (optional)"
          :readonly="loginProvidedFields.includes('email')"
          :disabled="loginProvidedFields.includes('email')"
          :rules="[(v) => !v || /.+@.+\..+/.test(v) || 'E-mail muss gültig sein']"
        ></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 3 : xs ? 12 : 6">
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
      <v-col :cols="mdAndUp ? 3 : xs ? 12 : 6">
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
      <v-col v-if="props.verbose" cols="12" class="text-body-1 mb-6">
        <v-alert :icon="mdiInformationOutline">
          Wir speichern nur Felder, die Sie selbst ausfüllen. Nicht editierbare Felder kommen direkt
          von Ihrem Login-Provider.
        </v-alert>
      </v-col>
    </v-row>
    <v-snackbar v-if="props.verbose" v-model="snackbar" timeout="2000">
      Benutzerdaten wurden gespeichert.
    </v-snackbar>
  </v-form>
</template>
