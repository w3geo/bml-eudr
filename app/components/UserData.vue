<script setup>
import { mdiInformationOutline } from '@mdi/js';

const props = defineProps({
  editable: Boolean,
});

const snackbar = ref(false);
const form = ref();
/** @type {Ref<import('~/utils/utils').EditableUserData|undefined>} */
const editableUserData = ref();
const canSave = ref(false);
/** Whether the saved user data is complete and valid */
const valid = ref(false);

async function validate() {
  const { valid } = await form.value.validate();
  return valid;
}
function resetValidation() {
  form.value.resetValidation();
}

async function save() {
  if (!canSave.value) {
    return;
  }
  await $fetch('/api/users/me', {
    method: 'PUT',
    body: editableUserData.value,
  });
  if (userData.value) {
    userData.value = { ...userData.value, ...structuredClone(toRaw(editableUserData.value)) };
  }
  snackbar.value = true;
}

defineExpose({
  validate,
  resetValidation,
  save,
  canSave,
  valid,
});

const { data: userData } = await useFetch('/api/users/me');
// Work on a copy, so the shared `userData` keeps reflecting what is saved
editableUserData.value = userData.value ? structuredClone(toRaw(userData.value)) : undefined;
const loginProvidedFields = userData.value
  ? (LOGIN_PROVIDED_FIELDS[userData.value.loginProvider] ?? [])
  : [];
// A login-provided address that does not have the expected format can be corrected by the user
const addressEditable =
  !loginProvidedFields.includes('address') || !isValidAddress(userData.value?.address);
canSave.value = loginProvidedFields.length < editableUserDataFields.length || addressEditable;
watchEffect(() => {
  valid.value = isUserDataValid(userData.value);
});

const address = userData.value?.address || '';
// An address that cannot be parsed goes into the street field, for the user to split up
const addressParts = reactive(
  parseAddress(address) ?? { street: address, postalCode: '', city: '' },
);
watch(addressParts, (parts) => {
  if (editableUserData.value) {
    editableUserData.value.address = formatAddress(parts);
  }
});

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
    <v-row v-if="userData?.loginProvider === 'AMA'">
      <v-col :cols="mdAndUp ? 4 : 12">
        <v-text-field
          :model-value="userData.id"
          density="compact"
          hide-details
          variant="outlined"
          label="Betriebsnummer"
          readonly
          disabled
        ></v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col :cols="mdAndUp ? 4 : 12">
        <v-text-field
          v-model="editableUserData.name"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="Name"
          :readonly="!props.editable || loginProvidedFields.includes('name')"
          :disabled="!props.editable || loginProvidedFields.includes('name')"
          :rules="[(v) => !!v || 'Name ist erforderlich']"
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
          :readonly="!props.editable || loginProvidedFields.includes('identifierType')"
          :disabled="!props.editable || loginProvidedFields.includes('identifierType')"
          :rules="[(v) => !!v || 'Identifikationstyp ist erforderlich']"
        ></v-select>
      </v-col>
      <v-col :cols="mdAndUp ? 5 : xs ? 12 : 6">
        <v-text-field
          v-model="editableUserData.identifierValue"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="Nummer"
          :readonly="!props.editable || loginProvidedFields.includes('identifierValue')"
          :disabled="!props.editable || loginProvidedFields.includes('identifierValue')"
          :rules="[(v) => !!v || 'Nummer ist erforderlich']"
        ></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 6 : 12">
        <v-text-field
          v-model="addressParts.street"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="Straße und Hausnummer"
          :readonly="!props.editable || !addressEditable"
          :disabled="!props.editable || !addressEditable"
          :rules="ADDRESS_RULES.street"
        ></v-text-field>
      </v-col>
      <v-col cols="auto" class="postal-code">
        <v-text-field
          v-model="addressParts.postalCode"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="PLZ"
          inputmode="numeric"
          maxlength="4"
          :readonly="!props.editable || !addressEditable"
          :disabled="!props.editable || !addressEditable"
          :rules="ADDRESS_RULES.postalCode"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="addressParts.city"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="Ort"
          :readonly="!props.editable || !addressEditable"
          :disabled="!props.editable || !addressEditable"
          :rules="ADDRESS_RULES.city"
        ></v-text-field>
      </v-col>
      <v-col v-if="props.editable && canSave" cols="12" class="text-body-1 mb-2">
        <v-alert v-if="loginProvidedFields.length > 0" :icon="mdiInformationOutline" class="mb-4">
          Nicht editierbare Felder wurden vom Anmeldedienst übernommen.
        </v-alert>
        Mit dem Klicken auf "Speichern" stimme ich zu, dass meine Daten zum Zweck der Erstellung von
        Vereinfachten Erklärungen gespeichert und verarbeitet werden.
      </v-col>
    </v-row>
    <v-snackbar v-if="props.editable && canSave" v-model="snackbar" timeout="2000">
      Benutzerdaten wurden gespeichert.
    </v-snackbar>
  </v-form>
</template>

<style scoped>
.postal-code {
  width: 6.5rem;
}
</style>
