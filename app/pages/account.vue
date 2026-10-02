<script setup>
import { DevOnly } from '#components';
import {
  mdiEmailFastOutline,
  mdiStar,
  mdiUnfoldLessHorizontal,
  mdiUnfoldMoreHorizontal,
} from '@mdi/js';

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

async function submitEmail() {
  await $fetch('/auth/otp', {
    method: 'POST',
    body: { email: email.value },
  });
  emailSubmitted.value = true;
}

async function submitOtp() {
  window.location.href = `/auth/otp?code=${otp.value}&email=${email.value}`;
}

/** @type {import('vue').Ref<import('~/components/UserData.vue').default|null>} */
const userDataForm = ref(null);

const { data: statements, error: statementsError } = await useFetch('/api/statements');
const unwatch = watch(
  [userDataForm, statements, statementsError],
  async ([form, statements, statementsError]) => {
    if (form) {
      const formOk = await form.validate();
      form.resetValidation();
      const noStatements = !statementsError && (statements?.length || 0) === 0;
      expandUserData.value = !formOk || noStatements;
      unwatch();
    }
  },
);

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
    </v-row>
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
            <v-icon v-if="xs" :icon="mdiStar" aria-label="Empfohlen" />
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
              v-if="!emailSubmitted"
              class="d-flex justify-center align-center fill-width"
              @submit.prevent="validateEmail(email) === true && submitEmail()"
            >
              <v-text-field
                v-model="email"
                label="E-Mail"
                variant="outlined"
                density="compact"
                hide-details="auto"
                validate-on="submit lazy"
                :rules="[validateEmail(email)]"
              /><v-btn
                class="ml-2"
                density="compact"
                :icon="mdiEmailFastOutline"
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
            Bitte geben Sie den per E-Mail erhaltenen Code ein.
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
