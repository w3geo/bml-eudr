<script setup>
import { mdiAlertCircleOutline } from '@mdi/js';
import { saveUserData } from '~/server/utils/utils';

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
  await saveUserData(userData);
  snackbar.value = true;
}

defineExpose({
  validate,
  save,
});

const { data: userData } = await useFetch('/api/users/me');

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
  <v-form v-if="userData" ref="form" validate-on="submit lazy" @submit.prevent="save">
    <v-row>
      <v-col :cols="mdAndUp ? 4 : 12">
        <v-text-field
          v-model="userData.name"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="Name"
          :readonly="userData.loginProvider !== 'OTP'"
          :disabled="userData.loginProvider !== 'OTP'"
          :rules="[(v) => !!v || 'Name ist erforderlich']"
        ></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 8 : 12">
        <v-text-field
          v-model="userData.address"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="Adresse"
          :readonly="userData.loginProvider !== 'OTP'"
          :disabled="userData.loginProvider !== 'OTP'"
          :rules="[(v) => !!v || 'Adresse ist erforderlich']"
        ></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 6 : 12">
        <v-text-field
          v-model="userData.email"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="e-mail (optional)"
          :rules="[(v) => !v || /.+@.+\..+/.test(v) || 'E-mail muss gültig sein']"
        ></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 3 : xs ? 12 : 6">
        <v-select
          v-model="userData.identifierType"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="Identifikationstyp"
          :items="idItems"
          item-value="value"
          item-text="title"
          :readonly="userData.loginProvider === 'AMA'"
          :disabled="userData.loginProvider === 'AMA'"
          :rules="[(v) => !!v || 'Identifikationstyp ist erforderlich']"
        ></v-select>
      </v-col>
      <v-col :cols="mdAndUp ? 3 : xs ? 12 : 6">
        <v-text-field
          v-model="userData.identifierValue"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="Identifikationsnummer"
          :readonly="userData.loginProvider === 'AMA'"
          :disabled="userData.loginProvider === 'AMA'"
          :rules="[(v) => !!v || 'Identifikationsnummer ist erforderlich']"
        ></v-text-field>
      </v-col>
      <v-col v-if="props.verbose" cols="12" class="text-body-1 mb-6">
        <v-alert :icon="mdiAlertCircleOutline">
          Felder, die von Ihrem Login-Provider bereitgestellt werden, können nicht bearbeitet
          werden.
        </v-alert>
      </v-col>
    </v-row>
    <v-snackbar v-if="props.verbose" v-model="snackbar" timeout="2000"
      >Benutzerdaten wurden gespeichert.</v-snackbar
    >
  </v-form>
</template>
