<script setup>
import { DevOnly } from '#components';
import { mdiEmailFastOutline } from '@mdi/js';

definePageMeta({
  title: 'Mein Konto',
  middleware: ['redirect-if-authenticated'],
  sort: 20,
});
useSeoMeta({
  title: 'Mein Konto',
});
const { loggedIn, clear } = useUserSession();
const { theme } = useBrowserTheme();
const { xs } = useDisplay();

const email = ref();
const otp = ref();
const emailSubmitted = ref(false);

async function submitEmail() {
  await $fetch('/api/auth/email', {
    method: 'POST',
    body: { email: email.value },
  });
  emailSubmitted.value = true;
}

async function submitOtp() {
  window.location.href = `/api/auth/email?code=${otp.value}&email=${email.value}`;
}

/** @type {import('vue').Ref<import('~/components/UserData.vue').default|null>} */
const userData = ref(null);

const loginRetry = useCookie('login-retry');
const loginError = useCookie('login-error');
</script>

<template>
  <v-container>
    <v-row>
      <v-alert v-if="loginRetry" closable
        >Anmeldung fehlgeschlagen, bitte versuchen Sie es noch einmal.</v-alert
      >
      <v-alert v-if="loginError" closable>{{ loginError }}</v-alert>
      <v-col cols="12">
        <v-card v-if="loggedIn">
          <v-card-title>Meine Referenznummern</v-card-title>
          <v-card-text>
            <StatementList />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col>
        <v-card v-if="loggedIn">
          <v-card-title>Angaben zum Betrieb</v-card-title>
          <v-card-text>
            <UserData ref="userData" verbose />
          </v-card-text>
          <v-card-actions>
            <v-btn @click="async () => (await userData?.validate()) && userData?.save()"
              >Speichern</v-btn
            >
            <v-spacer />
            <v-btn @click="clear">Logout</v-btn>
          </v-card-actions>
        </v-card>
        <v-card v-else>
          <v-card-title>Nicht angemeldet</v-card-title>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col :cols="xs ? 12 : 6">
        <v-card v-if="!loggedIn" class="fill-height" href="./auth/ama">
          <v-card-title class="text-center">Anmelden mit</v-card-title>
          <v-card-actions class="d-flex justify-center"
            ><v-img height="50" :src="`./logo_eama_${theme}.png`"
          /></v-card-actions>
          <v-card-text class="text-center"
            >Minimaler Aufwand bei der Sorgfaltspflichterklärung</v-card-text
          >
        </v-card>
      </v-col>
      <v-col :cols="xs ? 12 : 6">
        <v-card v-if="!loggedIn" class="fill-height" href="./auth/idaustria">
          <v-card-title class="text-center">Anmelden mit</v-card-title>
          <v-card-actions class="d-flex justify-center"
            ><v-img height="50" :src="`./id-austria-logo-${theme}.png`"
          /></v-card-actions>
          <v-card-text class="text-center">
            Für alle, die über kein eAMA Login verfügen</v-card-text
          >
        </v-card>
      </v-col>
      <v-col :cols="xs ? 12 : 6">
        <v-card v-if="!loggedIn" class="fill-height">
          <v-card-title v-if="!emailSubmitted" class="text-center">Anmelden mit</v-card-title>
          <v-card-title v-else class="text-center">Einmalcode eingeben</v-card-title>
          <v-card-actions class="d-flex justify-center"
            ><v-form
              v-if="!emailSubmitted"
              class="d-flex justify-center align-center fill-width"
              @submit.prevent="validateEmail(email) === true && submitEmail()"
              ><v-text-field
                v-model="email"
                label="E-Mail"
                variant="outlined"
                density="compact"
                hide-details="auto"
                validate-on="submit lazy"
                :rules="[validateEmail(email)]" /><v-btn
                class="ml-2"
                density="compact"
                :icon="mdiEmailFastOutline"
                color="primary"
                type="submit"
            /></v-form>
            <v-form v-else
              ><v-otp-input v-model="otp" autofocus length="6" @finish="submitOtp"
            /></v-form>
          </v-card-actions>
          <v-card-text v-if="!emailSubmitted" class="text-center">
            Wenn jemand anders die Sorgfaltspflichterklärung erstellen soll
          </v-card-text>
          <v-card-text v-else class="text-center">
            Bitte geben Sie den per E-Mail erhaltenen Code ein.
          </v-card-text>
        </v-card>
      </v-col>
      <DevOnly>
        <v-col :cols="xs ? 12 : 6">
          <v-card v-if="!loggedIn" class="fill-height" href="./auth/development">
            <v-card-title class="text-center">Entwickler</v-card-title>
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
