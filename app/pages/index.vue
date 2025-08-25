<script setup>
import { mdiFileSign, mdiLightbulbOn, mdiMapMarker } from '@mdi/js';

definePageMeta({
  title: 'Startseite',
  sort: 10,
});
useSeoMeta({
  title: 'Startseite',
  description: 'Sorgfaltspflichterklärung im Rahmen der EU-Entwaldungsverordnung (EUDR)',
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <p>
              Herzlich willkommen auf der Seite zur Sorgfaltspflichterklärung im Rahmen der EU-
              Entwaldungsverordnung (EUDR)!
            </p>
            <br />
            <p>
              Auf dieser Homepage haben Sie die Möglichkeit, Ihre Sorgfaltspflichterklärung schnell
              und einfach abzugeben. Zudem bieten wir Ihnen umfassende Informationen rund um die
              Entwaldungsverordnung, um Sie bestmöglich über Ihre Pflichten und den Schutz unserer
              Wälder zu informieren.
            </p>
            <br />
            <p>
              Nutzen Sie unser Service-Angebot, um sicherzustellen, dass Ihre Produkte den
              Anforderungen der EUDR entsprechen und tragen Sie dazu bei, die globalen Wälder zu
              bewahren.
            </p>
            <br />
            <p>
              Wir unterstützen Sie auf dem Weg zu nachhaltigem und verantwortungsvollem Handeln!
            </p>
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
          <v-card-title>Sorgfaltspflichterklärung</v-card-title>
          <v-card-text>
            Erstellung der Sorgfaltspflichterklärung und Referenznzmmernverwaltung direkt hier in
            der Applikation. Erfordert Anmeldung über eAMA Login oder ID Austria. Mit eAMA Login
            können Sie direkt die Ihrem Betrieb zugeordneten Flächen auswählen.
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
            Sorgfaltspflichtserklärung und Verwaltung der Referenznummern erfolgt dort.
          </v-card-text>
          <v-card-actions class="justify-center">
            <v-btn to="/locate" :prepend-icon="mdiMapMarker" color="primary"> Auswählen </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
