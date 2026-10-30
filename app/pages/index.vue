<script setup>
import { mdiCheckCircle, mdiCloseCircle, mdiFileSign, mdiLightbulbOn } from '@mdi/js';

definePageMeta({
  title: 'Startseite',
  sort: 10,
});
useSeoMeta({
  title: 'Startseite',
  description: 'Vereinfachte Erklärung im Rahmen der EU-Entwaldungsverordnung (EUDR)',
});

const audience = [
  { included: true, text: 'Kleinst- und Kleinprimärerzeuger in Österreich' },
  { included: true, text: 'Holz, Sojabohnen und Rinder, die Sie in Verkehr bringen' },
  {
    included: false,
    text: 'Sorgfaltserklärungen, z. B. für Handel oder Import. Dafür nutzen Sie bitte direkt das EU-Informationssystem TRACES.',
  },
];
const introVideo = {
  name: 'einfuehrung',
  title: 'Einführung in die EUDR',
  text: 'Was die EU-Entwaldungsverordnung verlangt und wer als Kleinst- oder Kleinprimärerzeuger die vereinfachte Erklärung nutzen kann: Umsatz unter 10 Mio. €, Bilanzsumme unter 5 Mio. €, weniger als 50 Beschäftigte.',
  duration: 160,
};
const loginVideos = [
  {
    name: 'einstieg-eama',
    title: 'Anmelden über eAMA',
    text: 'Der empfohlene Einstieg: Name, Anschrift, Betrieb und Flächen werden übernommen. Für rinderhaltende Betriebe ist er zwingend erforderlich.',
    duration: 87,
  },
  {
    name: 'einstieg-usp',
    title: 'Anmelden über USP',
    text: 'Anmelden über das Unternehmensserviceportal, mit USP-Kennung oder ID Austria.',
    duration: 40,
  },
  {
    name: 'einstieg-id-austria',
    title: 'Anmelden mit ID Austria',
    text: 'Anmelden mit ID Austria und die Angaben zum Betrieb ergänzen: GLN, Steuernummer oder UID.',
    duration: 87,
  },
  {
    name: 'einstieg-email',
    title: 'Anmelden mit E-Mail',
    text: 'Anmelden mit einem Einmalcode per E-Mail. Name, Anschrift und Identifikationsnummer des Betriebs geben Sie selbst ein.',
    duration: 102,
  },
];
const statementVideos = [
  {
    name: 'meldung-holz',
    title: 'Erklärung für Holz',
    text: 'Rohholz und Brennholz in Festmetern angeben, die Erklärung übermitteln und die Identifikationsnummer teilen oder drucken.',
    duration: 151,
  },
  {
    name: 'meldung-soja',
    title: 'Erklärung für Soja',
    text: 'Die Menge Sojabohnen in Tonnen angeben, die Ackerflächen aus dem Mehrfachantrag bestätigen und die Erklärung übermitteln.',
    duration: 157,
  },
  {
    name: 'meldung-rinder',
    title: 'Erklärung für Rinder',
    text: 'Die Anzahl der Rinder angeben, die Flächen aus Mehrfachantrag und Almauftriebsmeldung bestätigen und die Erklärung übermitteln.',
    duration: 158,
  },
];

/**
 * Only one video plays at a time.
 * @param {Event} event
 */
function pauseOtherVideos(event) {
  for (const video of document.querySelectorAll('video')) {
    if (video !== event.target) {
      video.pause();
    }
  }
}
</script>

<template>
  <v-container @play.capture="pauseOtherVideos">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <div class="text-body-1 mb-2">
              Herzlich willkommen auf der Seite zur Erstellung Ihrer Vereinfachten Erklärung im
              Rahmen der EU- Entwaldungsverordnung (EUDR) link zur EUDR VO 2023/1115!
            </div>
            <div class="text-body-1">
              Auf dieser Homepage haben Sie die Möglichkeit, Ihre Vereinfachte Erklärung schnell und
              einfach abzugeben. Die Videos auf dieser Seite zeigen Schritt für Schritt, wie es
              geht.
            </div>
          </v-card-text>
          <v-card-actions class="justify-center flex-wrap ga-2 pb-4">
            <v-btn
              to="/statement"
              :prepend-icon="mdiFileSign"
              color="primary"
              variant="flat"
              size="large"
            >
              Erklärung erstellen
            </v-btn>
            <v-btn
              target="_blank"
              href="https://environment.ec.europa.eu/topics/forests/deforestation/regulation-deforestation-free-products_en?prefLang=de&etrans=de"
              color="primary"
              variant="outlined"
              :prepend-icon="mdiLightbulbOn"
            >
              Weitere Informationen
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" md="7" lg="8">
        <v-card class="h-100">
          <v-card-title>Für wen ist diese Seite?</v-card-title>
          <v-card-text class="text-body-1">
            <div v-for="item in audience" :key="item.text" class="d-flex ga-3 mb-3">
              <v-icon
                :icon="item.included ? mdiCheckCircle : mdiCloseCircle"
                :color="item.included ? 'primary' : 'error'"
              />
              <div>{{ item.text }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="5" lg="4">
        <explainer-video v-bind="introVideo" />
      </v-col>
    </v-row>
    <h2 class="text-h5 mt-8">Anleitungen in Videos</h2>
    <h3 class="text-h6 mt-4 mb-2">So melden Sie sich an</h3>
    <v-row>
      <v-col v-for="video in loginVideos" :key="video.name" cols="12" sm="6" xl="3">
        <explainer-video v-bind="video" />
      </v-col>
    </v-row>
    <h3 class="text-h6 mt-6 mb-2">So erstellen Sie Ihre Erklärung</h3>
    <v-row>
      <v-col v-for="video in statementVideos" :key="video.name" cols="12" sm="6" lg="4">
        <explainer-video v-bind="video" />
      </v-col>
    </v-row>
  </v-container>
</template>
