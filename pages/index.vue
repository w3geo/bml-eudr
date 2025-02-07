<script setup>
definePageMeta({
  title: 'Startseite',
});
useSeoMeta({
  title: 'Startseite',
  description: 'Sorgfaltspflichterklärung im Rahmen der EU-Entwaldungsverordnung (EUDR)',
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <v-card>
          <v-card-text
            ><p>
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
            </p></v-card-text
          >
          <v-card-actions>
            <v-btn to="/statement" color="primary" prepend-icon="mdi-file-sign"
              >Sorgfaltspflichterklärung</v-btn
            ><v-spacer/>
            <v-btn target="_blank" href="https://environment.ec.europa.eu/topics/forests/deforestation/regulation-deforestation-free-products_en?prefLang=de&etrans=de" color="primary" prepend-icon="mdi-lightbulb-on"
              >Weitere Informationen</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
