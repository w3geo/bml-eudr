<script setup>
definePageMeta({
  middleware: ['authenticated-only'],
  title: 'Sorgfaltspflichterklärung',
});
useSeoMeta({
  title: 'Sorgfaltspflichterklärung',
  description:
    'Erstellen Sie Ihre Sorgfaltspflichterklärung im Rahmen der EU-Entwaldungsverordnung (EUDR) schnell und einfach.',
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <v-card>
          <v-card-title>Sorgfaltspflichterklärung</v-card-title>
          <v-card-text
            >Erstellung der Sorgfaltspflichterklärung und Referenznzmmernverwaltung direkt hier in
            der Applikation. Erfordert Anmeldung über eAMA Login oder ID Austria. Mit eAMA Login
            können Sie direkt die Ihrem Betrieb zugeordneten Flächen auswählen.</v-card-text
          >
          <v-card-actions>
            <v-btn to="/statement" color="primary" prepend-icon="mdi-sprout">Soja</v-btn
            ><v-spacer /><v-btn to="/statement" color="primary" prepend-icon="mdi-cow">Rind</v-btn
            ><v-spacer /><v-btn to="/statement" color="primary" prepend-icon="mdi-pine-tree"
              >Holz</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col>
        <v-card>
          <v-card-title>Nur Erzeugungsort erfassen</v-card-title>
          <v-card-text
            >Erfassung des Erezugungsorts hier in der Applikation. Download der Geolokalisation,
            dann Weiterleitung zur TRACES-NT Datenbank der Europäischen Union. Die Erstellung der
            Sorgfaltspflichtserklärung und Verwaltung der Referenznummern erfolgt dort.</v-card-text
          >
          <v-card-actions>
            <v-btn to="/statement" color="primary" prepend-icon="mdi-sprout">Soja</v-btn
            ><v-spacer /><v-btn to="/statement" color="primary" prepend-icon="mdi-cow">Rind</v-btn
            ><v-spacer /><v-btn to="/statement" color="primary" prepend-icon="mdi-pine-tree"
              >Holz</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
