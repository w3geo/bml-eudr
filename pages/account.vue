<script setup>
import { DevOnly } from '#components';

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

const loginRetryAlert = useCookie('login-retry');
</script>

<template>
  <v-container>
    <v-row>
      <v-col v-if="loginRetryAlert" cols="12">
        <v-alert v-model="loginRetryAlert" closable
          >Anmeldung fehlgeschlagen, bitte versuchen Sie es noch einmal.</v-alert
        >
      </v-col>
      <v-col>
        <v-card v-if="loggedIn">
          <v-card-title>Profil</v-card-title>
          <v-card-text>
            <UserData />
          </v-card-text>
          <v-card-actions>
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
      <v-col cols="6">
        <v-card v-if="!loggedIn" class="fill-height" href="./auth/ama">
          <v-card-title class="d-flex justify-center">Anmelden mit</v-card-title>
          <v-card-actions class="d-flex justify-center"
            ><v-img max-height="50" :src="`./logo_eama_${theme}.png`"
          /></v-card-actions>
          <v-card-text class="d-flex justify-center">
            Minimaler Aufwand bei der Sorgfaltspflichterklärung</v-card-text
          >
        </v-card>
      </v-col>
      <v-col cols="6">
        <v-card v-if="!loggedIn" class="fill-height" href="./auth/idaustria">
          <v-card-title class="d-flex justify-center">Anmelden mit</v-card-title>
          <v-card-actions class="d-flex justify-center"
            ><v-img max-height="50" :src="`./id-austria-logo-${theme}.png`"
          /></v-card-actions>
          <v-card-text class="d-flex justify-center">
            Für alle, die über kein eAMA Login verfügen</v-card-text
          >
        </v-card>
      </v-col>
      <DevOnly>
        <v-col cols="6">
          <v-card v-if="!loggedIn" class="fill-height" href="./auth/development">
            <v-card-title class="d-flex justify-center">Entwickler</v-card-title>
          </v-card>
        </v-col>
      </DevOnly>
    </v-row>
  </v-container>
</template>
