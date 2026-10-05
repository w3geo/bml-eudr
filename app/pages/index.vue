<script setup>
import { mdiFileSign, mdiLightbulbOn } from '@mdi/js';

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
          <v-card-actions class="justify-center">
            <v-btn
              to="/statement"
              :prepend-icon="mdiFileSign"
              color="primary"
              variant="flat"
              size="large"
            >
              Erklärung erstellen
            </v-btn>
          </v-card-actions>
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
              variant="outlined"
              :prepend-icon="mdiLightbulbOn"
            >
              Weitere Informationen
            </v-btn>
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
