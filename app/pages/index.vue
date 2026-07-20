<script setup>
import { mdiFileSign, mdiLightbulbOn, mdiMapMarker } from '@mdi/js';

definePageMeta({
  title: 'Startseite',
  sort: 10,
});
useSeoMeta({
  title: 'Startseite',
  description: 'Vereinfachte Erklärung im Rahmen der EU-Entwaldungsverordnung (EUDR)',
});
</script>

<template>
  <v-container>
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
              einfach abzugeben.
            </div>
          </v-card-text>
          <v-card-text class="d-flex flex-column align-center">
            <v-img
              alt="Ablauf Vereinfachte Erklärung"
              class="border-rounded"
              rounded
              width="800"
              src="/EU_Entwaldungsverordnung_Grafik_Einmeldung.png"
            />
          </v-card-text>
          <v-card-actions class="justify-center">
            <v-btn
              target="_blank"
              href="https://environment.ec.europa.eu/topics/forests/deforestation/regulation-deforestation-free-products_en?prefLang=de&etrans=de"
              color="primary"
              :prepend-icon="mdiLightbulbOn"
            >
              Weitere Informationen
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col>
        <v-card>
          <v-card-title>Vereinfachte Erklärung</v-card-title>
          <v-card-text>
            Erstellung der Vereinfachten Erklärung und Referenznummernverwaltung direkt hier in der
            Applikation. Erfordert Anmeldung über eAMA Login oder ID Austria. Mit eAMA Login können
            Sie direkt die Ihrem Betrieb zugeordneten Flächen auswählen.
          </v-card-text>
          <v-card-actions class="justify-center">
            <v-btn to="/statement" :prepend-icon="mdiFileSign" color="primary"> Auswählen </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col>
        <v-card>
          <v-card-title>Nur Erzeugungsort erfassen</v-card-title>
          <v-card-text>
            Erfassung des Erezugungsorts hier in der Applikation. Download der Geolokalisation,
            Weiterleitung zur TRACES-NT Datenbank der Europäischen Union. Die Erstellung der
            Vereinfachte Erklärung und Verwaltung der Referenznummern erfolgt dort.
          </v-card-text>
          <v-card-actions class="justify-center">
            <v-btn to="/locate" :prepend-icon="mdiMapMarker" color="primary"> Auswählen </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.border-rounded {
  border: 10px solid white;
  border-radius: 6px;
}
</style>
