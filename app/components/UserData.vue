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
const addressEditable = !loginProvidedFields.includes('address');
canSave.value = loginProvidedFields.length < editableUserDataFields.length;
watchEffect(() => {
  valid.value = isUserDataValid(userData.value, userData.value?.loginProvider);
});
/** Login-provided fields that are incomplete, and can only be fixed at the login provider */
const incompleteProvidedFields = computed(() =>
  getInvalidUserDataFields(userData.value, userData.value?.loginProvider).filter((key) =>
    loginProvidedFields.includes(key),
  ),
);

/** @type {Record<import('~~/shared/utils/constants').LoginProvider, string>} */
const PROVIDER_FIX_HINTS = {
  OTP: '',
  SMS: '',
  IDA: 'Die Adresse kommt aus dem Zentralen Melderegister und kann bei Ihrer Meldebehörde (Gemeinde bzw. Magistrat) berichtigt werden.',
  AMA: 'Die Adresse kommt aus eAMA und kann bei der AMA berichtigt werden.',
  USP: 'Die Adresse kommt aus den Unternehmensdaten im Unternehmensserviceportal (USP) und kann dort berichtigt werden.',
};

const addressParts = reactive({
  street: userData.value?.address?.street ?? '',
  postalCode: userData.value?.address?.postalCode ?? '',
  city: userData.value?.address?.city ?? '',
});
watch(addressParts, (parts) => {
  if (editableUserData.value) {
    editableUserData.value.address = { ...parts };
  }
});

/** @type {Record<string, { validate: () => Promise<string[]> }|null>} */
const fields = {};
/**
 * @param {string} key
 * @returns {(el: any) => void}
 */
const fieldRef = (key) => (el) => {
  fields[key] = el;
};
onMounted(() => {
  if (!props.editable || valid.value || !editableUserData.value) {
    return;
  }
  // Show what is wrong with existing data right away, instead of only on submit. Empty fields are
  // left alone, so a new user does not start with a form full of errors.
  /** @type {Record<string, string|null|undefined>} */
  const values = {
    name: editableUserData.value.name,
    identifierType: editableUserData.value.identifierType,
    identifierValue: editableUserData.value.identifierValue,
    ...addressParts,
  };
  for (const [key, field] of Object.entries(fields)) {
    if (values[key]?.trim()) {
      field?.validate();
    }
  }
});

const { mdAndUp, xs } = useDisplay();

const idItems = computed(() => [
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
  // Not selectable, only set as fixed value from the LFBIS number provided at SMS login
  ...(editableUserData.value?.identifierType === 'ONI' ? [{ title: 'LFBIS', value: 'ONI' }] : []),
]);
</script>
<template>
  <v-form v-if="editableUserData" ref="form" validate-on="submit lazy" @submit.prevent="save">
    <v-row v-if="userData?.loginProvider === 'AMA'">
      <v-col :cols="mdAndUp ? 4 : 12">
        <v-text-field
          :model-value="userData.lfbis"
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
          :ref="fieldRef('name')"
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
          :ref="fieldRef('identifierType')"
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
          :ref="fieldRef('identifierValue')"
          v-model="editableUserData.identifierValue"
          density="compact"
          hide-details="auto"
          variant="outlined"
          label="Nummer"
          :readonly="!props.editable || loginProvidedFields.includes('identifierValue')"
          :disabled="!props.editable || loginProvidedFields.includes('identifierValue')"
          :rules="[
            (v) => !!v || 'Nummer ist erforderlich',
            // Numbers provided by the login cannot be changed by the user, so they are not checked
            (v) =>
              loginProvidedFields.includes('identifierValue') ||
              validateIdentifier(editableUserData?.identifierType, v),
          ]"
        ></v-text-field>
      </v-col>
      <v-col :cols="mdAndUp ? 6 : 12">
        <v-text-field
          :ref="fieldRef('street')"
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
          :ref="fieldRef('postalCode')"
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
          :ref="fieldRef('city')"
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
      <v-col v-if="props.editable && incompleteProvidedFields.length > 0" cols="12">
        <v-alert type="warning" variant="tonal">
          <template v-if="incompleteProvidedFields.includes('address')">
            Ihre Adresse ist beim Anmeldedienst unvollständig (Straße und Hausnummer, PLZ und Ort
            werden benötigt).
          </template>
          <template v-else>Ihre Daten sind beim Anmeldedienst unvollständig.</template>
          {{ PROVIDER_FIX_HINTS[userData?.loginProvider ?? 'OTP'] }}
          Bis dahin können Sie keine vereinfachten Erklärungen abgeben. Alternativ können Sie sich
          mit Ihrer E-Mail-Adresse anmelden und Ihre Daten selbst eingeben.
        </v-alert>
      </v-col>
      <v-col v-if="props.editable && canSave" cols="12" class="text-body-1 mb-2">
        <v-alert v-if="loginProvidedFields.length > 0" :icon="mdiInformationOutline" class="mb-4">
          Nicht editierbare Felder wurden vom Anmeldedienst übernommen.
        </v-alert>
        Mit dem Klicken auf „Speichern“ stimme ich zu, dass meine Daten zum Zweck der Erstellung von
        vereinfachten Erklärungen gespeichert und verarbeitet werden.
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
