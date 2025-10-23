<script setup>
import { DevOnly } from '#components';
import { mdiEmailFastOutline, mdiUnfoldLessHorizontal, mdiUnfoldMoreHorizontal } from '@mdi/js';

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
            ><v-toolbar color="transparent" flat density="compact"
              >Angaben zum Betrieb<v-spacer /><v-btn
                flat
                density="compact"
                :icon="expandUserData ? mdiUnfoldLessHorizontal : mdiUnfoldMoreHorizontal"
                @click="expandUserData = !expandUserData" /></v-toolbar
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
      <v-col cols="12">
        <v-card v-if="loggedIn">
          <v-card-title class="mt-2 mb-2">Meine Referenznummern</v-card-title>
          <v-card-text>
            <StatementList />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-if="!loggedIn">
      <v-col :cols="xs ? 12 : 6">
        <v-card class="fill-height" href="./auth/ama">
          <v-card-title class="text-center"> Anmelden mit </v-card-title>
          <v-card-actions class="d-flex justify-center">
            <v-img alt="eAMA" height="50" :src="`./logo_eama_${theme.value}.png`" />
          </v-card-actions>
          <v-card-text class="text-center">
            Nutzung bestehender Verwaltungsdaten zur einfacheren Zuordnung der Bewirtschafter zu
            ihren Flächen bzw. Rindern
          </v-card-text>
        </v-card>
      </v-col>
      <v-col :cols="xs ? 12 : 6">
        <v-card class="fill-height" href="./auth/usp">
          <v-card-title class="text-center"> Anmelden über </v-card-title>
          <v-card-actions class="d-flex justify-center">
            <v-img
              alt="Unternehmensserviceportal"
              height="50"
              :src="`./USP_Logo_${theme.value}.png`"
            />
          </v-card-actions>
          <v-card-text class="text-center">
            Für land-/forstwirtschaftliche Betriebe, die über kein eAMA Login verfügen (keine
            Zuordnung der Bewirtschafter zu ihren Flächen)
          </v-card-text>
        </v-card>
      </v-col>
      <v-col :cols="xs ? 12 : 6">
        <v-card class="fill-height" href="./auth/idaustria">
          <v-card-title class="text-center"> Anmelden mit </v-card-title>
          <v-card-actions class="d-flex justify-center">
            <v-img alt="ID Austria" height="50" :src="`./id-austria-logo-${theme.value}.png`" />
          </v-card-actions>
          <v-card-text class="text-center">
            Für private Bewirtschafter, die über kein eAMA Login verfügen (keine Zuordnung der
            Bewirtschafter zu ihren Flächen)
          </v-card-text>
        </v-card>
      </v-col>
      <v-col :cols="xs ? 12 : 6">
        <v-card class="fill-height">
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
          <v-card-text v-if="!emailSubmitted" class="text-center">
            Wenn jemand anderes die Sorgfaltserklärung erstellen soll (keine Zuordnung der
            Bewirtschafter zu ihren Flächen)
          </v-card-text>
          <v-card-text v-else class="text-center">
            Bitte geben Sie den per E-Mail erhaltenen Code ein.
          </v-card-text>
        </v-card>
      </v-col>
      <DevOnly>
        <v-col :cols="xs ? 12 : 6">
          <v-card class="fill-height" href="./auth/development">
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
</style>
