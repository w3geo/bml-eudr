<script setup>
import { mdiCheckCircle, mdiLogin } from '@mdi/js';

// Public, so search engines can index it: logged out, an introduction with a login link,
// logged in, the statement editor.
definePageMeta({
  title: 'Vereinfachte Erklärung',
  sort: 20,
});
const description =
  'Vereinfachte Erklärung für Holz, Sojabohnen und Rinder nach der EU-Entwaldungsverordnung (EUDR) online abgeben und die Identifikationsnummer erhalten.';
useSeoMeta({
  title: 'Vereinfachte Erklärung',
  description,
  ogDescription: description,
});

const { loggedIn } = useUserSession();
// Read by the redirect-if-authenticated middleware on /account, which brings users back here
// after logging in.
const redirect = useCookie('redirect');

const steps = [
  'Anmelden mit eAMA, USP, ID Austria oder E-Mail und die Angaben zum Betrieb prüfen.',
  'Die Mengen angeben: Holz in Festmetern, Sojabohnen in Tonnen, Rinder als Anzahl. Mehrere Rohstoffe passen in eine Erklärung.',
  'Die Erzeugungsorte bestätigen oder auf der Karte einzeichnen. Bei Anmeldung über eAMA werden die Flächen aus dem Mehrfachantrag übernommen.',
  'Die Erklärung übermitteln. Anschließend erhalten Sie die Identifikationsnummer, die Sie teilen oder drucken können.',
];
</script>

<template>
  <template v-if="loggedIn">
    <DisclaimerDialog />
    <StatementEditor />
  </template>
  <v-container v-else>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text class="text-body-1">
            <h1 class="text-h5 mb-4">Vereinfachte Erklärung</h1>
            <p class="mb-2">
              Kleinst- und Kleinprimärerzeuger in Österreich, die Holz, Sojabohnen oder Rinder in
              Verkehr bringen, geben im Rahmen der EU-Entwaldungsverordnung (EUDR) eine vereinfachte
              Erklärung ab. Hier erstellen Sie diese Erklärung online und übermitteln sie direkt an
              das EU-Informationssystem TRACES.
            </p>
            <p>Für Sorgfaltserklärungen, z. B. für Handel oder Import, nutzen Sie bitte TRACES.</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12">
        <v-card>
          <v-card-text class="text-body-1">
            <h2 class="text-h6 mb-3">So geht's</h2>
            <ol class="steps">
              <li v-for="step in steps" :key="step" class="d-flex ga-3 mb-3">
                <v-icon :icon="mdiCheckCircle" color="primary" />
                <div>{{ step }}</div>
              </li>
            </ol>
          </v-card-text>
          <v-card-actions class="justify-center flex-wrap ga-2 pb-4">
            <v-btn
              to="/account"
              :prepend-icon="mdiLogin"
              color="primary"
              variant="flat"
              size="large"
              @click="redirect = '/statement'"
            >
              Anmelden und Erklärung erstellen
            </v-btn>
            <v-btn to="/" color="primary" variant="outlined" size="large">
              Anleitungen in Videos
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.steps {
  list-style: none;
  padding: 0;
}
</style>
