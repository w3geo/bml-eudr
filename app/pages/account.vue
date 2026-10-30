<script setup>
import { DevOnly } from '#components';
import {
  mdiAccountRemove,
  mdiEmailFastOutline,
  mdiStar,
  mdiUnfoldLessHorizontal,
  mdiUnfoldMoreHorizontal,
} from '@mdi/js';
import { FetchError } from 'ofetch';

definePageMeta({
  title: 'Mein Konto',
  middleware: ['redirect-if-authenticated'],
  sort: 20,
});
useSeoMeta({
  title: 'Mein Konto',
});
const { loggedIn } = useUserSession();
const theme = useColorMode();
const { xs } = useDisplay();
const { errorMessage } = useErrorMessage();

/** @type {Record<'legend'|'eama'|'usp'|'idaustria'|'email',Array<{ text: string, type: 'pro'|'effort'|'con' }>>} */
const features = {
  legend: [
    { text: 'übernommen', type: 'pro' },
    { text: 'manuell', type: 'effort' },
    { text: 'nicht möglich', type: 'con' },
  ],
  eama: [
    { text: 'Name/Anschrift', type: 'pro' },
    { text: 'Betrieb', type: 'pro' },
    { text: 'Flächen', type: 'pro' },
    { text: 'Rinder', type: 'pro' },
  ],
  usp: [
    { text: 'Name/Anschrift', type: 'pro' },
    { text: 'Betrieb', type: 'pro' },
    { text: 'Flächen', type: 'effort' },
    { text: 'Rinder', type: 'con' },
  ],
  idaustria: [
    { text: 'Name/Anschrift', type: 'pro' },
    { text: 'Betrieb', type: 'effort' },
    { text: 'Flächen', type: 'effort' },
    { text: 'Rinder', type: 'con' },
  ],
  email: [
    { text: 'Name/Anschrift', type: 'effort' },
    { text: 'Betrieb', type: 'effort' },
    { text: 'Flächen', type: 'effort' },
    { text: 'Rinder', type: 'con' },
  ],
};

const email = ref();
const otp = ref();
const emailSubmitted = ref(false);
const expandUserData = ref(false);

// Hidden feature: entering a phone number (e.g. +436601234567) instead of an e-mail address asks
// for an LFBIS number, and the code is sent by SMS if that LFBIS number is known.
/** @type {import('vue').Ref<string|undefined>} */
const phone = ref();
const lfbis = ref();
/** @type {import('vue').Ref<string|undefined>} */
const lfbisError = ref();

/** @param {string} value */
const validateEmailOrPhone = (value) => isPhoneNumber(value) || validateEmail(value);

async function submitEmail() {
  if (isPhoneNumber(email.value)) {
    phone.value = email.value;
    return;
  }
  await $fetch('/auth/otp', {
    method: 'POST',
    body: { email: email.value },
  });
  emailSubmitted.value = true;
}

async function submitLfbis() {
  lfbisError.value = undefined;
  try {
    await $fetch('/auth/otp', {
      method: 'POST',
      body: { phone: phone.value, lfbis: lfbis.value },
    });
  } catch (e) {
    lfbisError.value =
      /** @type {import('ofetch').FetchError} */ (e).data?.message ||
      'Code konnte nicht gesendet werden';
    return;
  }
  emailSubmitted.value = true;
  receiveSmsOtp();
}

/** @type {AbortController|undefined} */
let smsOtpAbort;
onBeforeUnmount(() => smsOtpAbort?.abort());

/**
 * Let browsers that support the WebOTP API (Chrome on Android) read the code from the SMS.
 * Safari uses AutoFill on the `one-time-code` input instead.
 */
async function receiveSmsOtp() {
  if (!('OTPCredential' in window)) {
    return;
  }
  smsOtpAbort = new AbortController();
  try {
    const credential = /** @type {Credential & { code: string } | null} */ (
      await navigator.credentials.get(
        /** @type {CredentialRequestOptions} */ ({
          otp: { transport: ['sms'] },
          signal: smsOtpAbort.signal,
        }),
      )
    );
    if (credential?.code) {
      otp.value = credential.code;
      submitOtp();
    }
  } catch {
    // Aborted, or the user declined: the code can still be entered manually
  }
}

async function submitOtp() {
  const params = new URLSearchParams({ code: otp.value });
  if (phone.value) {
    params.set('phone', phone.value);
    params.set('lfbis', lfbis.value);
  } else {
    params.set('email', email.value);
  }
  window.location.href = `/auth/otp?${params}`;
}

/** @type {import('vue').Ref<import('~/components/UserData.vue').default|null>} */
const userDataForm = ref(null);

const { data: statements, error: statementsError } = await useFetch('/api/statements');
const unwatch = watch(
  [userDataForm, statements, statementsError],
  async ([form, statements, statementsError]) => {
    if (form) {
      // Only validate to decide whether to expand the form; don't show errors before the user
      // had a chance to fill it in
      const formOk = await form.validate();
      form.resetValidation();
      const noStatements = !statementsError && (statements?.length || 0) === 0;
      expandUserData.value = !formOk || noStatements;
      unwatch();
    }
  },
);

// Statements can only be created with complete and valid user data, so don't let the user
// move on to the statement page before the form validates and is saved.
onBeforeRouteLeave(async (to) => {
  const form = userDataForm.value;
  if (!loggedIn.value || !form || to.path !== '/statement') {
    return;
  }
  if (!(await form.validate())) {
    expandUserData.value = true;
    errorMessage.value = 'Bitte vervollständigen Sie zuerst die Angaben zum Betrieb.';
    return false;
  }
  if (!form.valid) {
    expandUserData.value = true;
    errorMessage.value = 'Bitte speichern Sie zuerst die Angaben zum Betrieb.';
    return false;
  }
});

const loginRetry = useCookie('login-retry');
const loginError = useCookie('login-error');
watch(
  [loginRetry, loginError],
  ([retry, error]) => {
    if (!retry && !error) {
      return;
    }
    errorMessage.value = error || 'Anmeldung fehlgeschlagen, bitte versuchen Sie es noch einmal.';
  },
  { immediate: true },
);

const logout = useLogout();
const deleteDialog = ref(false);
const deleting = ref(false);

async function deleteAccount() {
  deleting.value = true;
  try {
    await $fetch('/api/users/me', { method: 'DELETE' });
    deleteDialog.value = false;
    await logout();
  } catch (error) {
    errorMessage.value =
      (error instanceof FetchError && error.data?.message) ||
      'Das Konto konnte nicht gelöscht werden. Bitte versuchen Sie es später erneut.';
  } finally {
    deleting.value = false;
  }
}

if (!statementsError.value) {
  expandUserData.value = (statements.value?.length || 0) === 0;
}
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <v-card v-if="loggedIn">
          <v-card-title
            ><v-toolbar
              color="transparent"
              flat
              density="compact"
              class="cursor-pointer"
              @click="expandUserData = !expandUserData"
              >Angaben zum Betrieb<v-spacer /><v-btn
                flat
                density="compact"
                aria-label="Angaben zum Betrieb"
                :aria-expanded="expandUserData"
                :icon="
                  expandUserData ? mdiUnfoldLessHorizontal : mdiUnfoldMoreHorizontal
                " /></v-toolbar
          ></v-card-title>
          <v-expand-transition>
            <v-sheet v-show="expandUserData">
              <v-card-text>
                <UserData ref="userDataForm" editable />
              </v-card-text>
              <v-card-actions>
                <v-btn
                  v-if="userDataForm?.canSave"
                  color="primary"
                  @click="async () => (await userDataForm?.validate()) && userDataForm?.save()"
                >
                  Speichern
                </v-btn>
              </v-card-actions>
            </v-sheet>
          </v-expand-transition>
        </v-card>
        <v-card v-else>
          <v-card-title>Nicht angemeldet</v-card-title>
        </v-card>
      </v-col>
      <v-col v-if="loggedIn" cols="12">
        <v-card>
          <v-card-title class="mt-2 mb-2">Meine Identifikationsnummern</v-card-title>
          <v-card-text>
            <StatementList />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col v-if="loggedIn" cols="12">
        <v-card>
          <v-card-title>Konto löschen</v-card-title>
          <v-card-text>
            Löscht Ihr Konto und alle Daten, die diese Applikation zu Ihnen gespeichert hat.
          </v-card-text>
          <v-card-actions>
            <v-btn color="error" :prepend-icon="mdiAccountRemove" @click="deleteDialog = true">
              Konto löschen
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
    <v-dialog v-model="deleteDialog" max-width="560" :persistent="deleting" scrollable>
      <v-card title="Konto löschen?">
        <v-card-text>
          <p class="mb-3">
            Gelöscht werden die in dieser Applikation gespeicherten Angaben zum Betrieb und die
            gespeicherten Kopien Ihrer vereinfachten Erklärungen mit Rohstoffen/Erzeugnissen, Mengen
            und Erzeugungsorten. Anschließend werden Sie abgemeldet.
          </p>
          <p class="mb-3">
            Ihre vereinfachten Erklärungen bleiben im EU-Informationssystem TRACES gültig und werden
            nicht zurückgezogen. Wenn Sie sich später mit derselben Anmeldeart wieder anmelden,
            werden sie unter „Meine Identifikationsnummern“ wieder angezeigt, allerdings ohne
            Details.
          </p>
          <p>
            Für vereinfachte Erklärungen mit Rindern werden Betriebsnummer und Anzahl der Rinder
            nach Vergabe der Identifikationsnummer an die AMA übermittelt. Das gilt auch für
            Erklärungen, deren Identifikationsnummer bei der Löschung noch aussteht.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn :disabled="deleting" @click="deleteDialog = false">Abbrechen</v-btn>
          <v-btn color="error" :loading="deleting" @click="deleteAccount">Konto löschen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-row v-if="!loggedIn">
      <v-col cols="12">
        <v-card href="./auth/ama" variant="tonal" color="primary" elevation="1">
          <v-chip
            class="recommended"
            color="primary"
            variant="flat"
            size="small"
            :prepend-icon="xs ? undefined : mdiStar"
            :title="xs ? 'Empfohlen' : undefined"
          >
            <template v-if="xs">
              <v-icon :icon="mdiStar" />
              <span class="d-sr-only">Empfohlen</span>
            </template>
            <template v-else>Empfohlen</template>
          </v-chip>
          <v-card-title class="text-center text-high-emphasis pt-4"> Anmelden über </v-card-title>
          <v-card-actions class="d-flex justify-center">
            <v-img alt="eAMA" height="80" :src="`./logo_eama_${theme.value}.png`" />
          </v-card-actions>
          <v-card-text class="text-center text-medium-emphasis pt-0">
            mit ID Austria oder Betriebsnummer/Passwort – alle Daten werden übernommen:
          </v-card-text>
          <v-card-text class="pt-0 pb-6">
            <LoginFeatures :features="features.eama" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" class="d-flex align-center mt-2">
        <v-divider />
        <span class="divider-label mx-4 text-medium-emphasis text-center">
          Kein eAMA Login? Weitere Anmeldemöglichkeiten:
        </span>
        <v-divider />
      </v-col>
      <v-col cols="12" class="pt-0 text-body-2 text-medium-emphasis text-center">
        <p class="mb-2">
          Je nach Anmeldeart müssen Sie Daten selbst eingeben, oder es stehen nicht alle Funktionen
          zur Verfügung:
        </p>
        <LoginFeatures :features="features.legend" />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card
          class="fill-height d-flex flex-column justify-center"
          min-height="180"
          href="./auth/usp"
        >
          <v-card-title class="text-center"> Anmelden über </v-card-title>
          <v-card-actions class="d-flex justify-center">
            <v-img
              alt="Unternehmensserviceportal"
              height="36"
              :src="`./USP_Logo_${theme.value}.png`"
            />
          </v-card-actions>
          <v-card-text>
            <LoginFeatures :features="features.usp" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card
          class="fill-height d-flex flex-column justify-center"
          min-height="180"
          href="./auth/idaustria"
        >
          <v-card-title class="text-center"> Anmelden mit </v-card-title>
          <v-card-actions class="d-flex justify-center">
            <v-img alt="ID Austria" height="36" :src="`./id-austria-logo-${theme.value}.png`" />
          </v-card-actions>
          <v-card-text>
            <LoginFeatures :features="features.idaustria" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card class="fill-height d-flex flex-column justify-center" min-height="180">
          <v-card-title v-if="!emailSubmitted" class="text-center"> Anmelden mit </v-card-title>
          <v-card-title v-else class="text-center"> Einmalcode eingeben </v-card-title>
          <v-card-actions class="d-flex justify-center">
            <v-form
              v-if="!emailSubmitted && phone"
              class="d-flex justify-center align-center fill-width"
              @submit.prevent="lfbis && submitLfbis()"
            >
              <v-text-field
                v-model="lfbis"
                label="Betriebsnummer (LFBIS)"
                variant="outlined"
                density="compact"
                hide-details="auto"
                inputmode="numeric"
                autofocus
                :error-messages="lfbisError"
                @update:model-value="lfbisError = undefined"
              /><v-btn
                class="ml-2"
                density="compact"
                :icon="mdiEmailFastOutline"
                aria-label="Einmalcode anfordern"
                color="primary"
                type="submit"
              />
            </v-form>
            <v-form
              v-else-if="!emailSubmitted"
              class="d-flex justify-center align-center fill-width"
              @submit.prevent="validateEmailOrPhone(email) === true && submitEmail()"
            >
              <v-text-field
                v-model="email"
                label="E-Mail"
                variant="outlined"
                density="compact"
                hide-details="auto"
                validate-on="submit lazy"
                :rules="[validateEmailOrPhone(email)]"
              /><v-btn
                class="ml-2"
                density="compact"
                :icon="mdiEmailFastOutline"
                aria-label="Einmalcode anfordern"
                color="primary"
                type="submit"
              />
            </v-form>
            <v-form v-else>
              <v-otp-input v-model="otp" autofocus length="6" @finish="submitOtp" />
            </v-form>
          </v-card-actions>
          <v-card-text v-if="!emailSubmitted">
            <LoginFeatures :features="features.email" />
          </v-card-text>
          <v-card-text v-else class="text-center">
            Bitte geben Sie den per {{ phone ? 'SMS' : 'E-Mail' }} erhaltenen Code ein.
          </v-card-text>
        </v-card>
      </v-col>
      <DevOnly>
        <v-col cols="12" sm="6" md="4">
          <v-card
            class="fill-height d-flex flex-column justify-center"
            min-height="180"
            href="./auth/development"
          >
            <v-card-title class="text-center"> Entwickler </v-card-title>
          </v-card>
        </v-col>
      </DevOnly>
    </v-row>
  </v-container>
</template>

<style scoped>
.fill-width {
  width: 100%;
}
.divider-label {
  flex-shrink: 0;
  max-width: 70%;
}
.recommended {
  position: absolute;
  top: 12px;
  right: 12px;
}
</style>
